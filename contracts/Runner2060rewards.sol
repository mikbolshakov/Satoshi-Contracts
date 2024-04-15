// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Pausable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract Runner2060rewards is
    ERC1155,
    AccessControl,
    ERC1155Pausable,
    ERC1155Supply,
    ERC2981,
    EIP712
{
    using Strings for uint256;

    // Struct with minting params
    struct MintingParams {
        uint256 tokenId;
        uint256 amount;
        bytes32 salt;
    }

    // Struct with batch minting params
    struct BatchMintingParams {
        uint256[] tokenIds;
        uint256[] amounts;
        bytes32 salt;
    }

    // EIP712 message type hash
    bytes32 constant MINT_TYPE_HASH =
        keccak256("MintingParams(uint256 tokenId,uint256 amount,bytes32 salt)");

    bytes32 constant BATCH_MINT_TYPE_HASH =
        keccak256(
            "BatchMintingParams(uint256[] tokenIds,uint256[] amounts,bytes32 salt)"
        );

    // signed message => bool verified
    mapping(bytes => bool) verifiedMessages;
    // token id => max supply
    mapping(uint256 => uint256) public maxSupply;

    address mintingMaintainer;
    uint256 uniqueItemsCount;
    string _baseURI;

    bytes32 public constant PAUSE_ROLE = keccak256("PAUSE_ROLE");
    bytes32 public constant MAINTAINER_ROLE = keccak256("MAINTAINER_ROLE");
    bytes32 public constant ID_ADDER_ROLE = keccak256("ID_ADDER_ROLE");

    event MaintenanceTransferred(address maintainer, address newMaintainer);

    constructor(
        address _mintingMaintainerAddress,
        address _royaltyReceiver,
        uint96 _feeNumerator,
        address defaultAdmin
    ) ERC1155("") EIP712("Runner2060rewards", "V1") {
        mintingMaintainer = _mintingMaintainerAddress;
        _setDefaultRoyalty(_royaltyReceiver, _feeNumerator);
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(PAUSE_ROLE, defaultAdmin);
        _grantRole(MAINTAINER_ROLE, defaultAdmin);
        _grantRole(ID_ADDER_ROLE, defaultAdmin);
    }

    // ------------- Getters ------------- //
    /// @notice Get the mintingMaintainer address.
    /// @return the mintingMaintainer address.
    function getMintingMaintainer() external view returns (address) {
        return mintingMaintainer;
    }

    /// @notice Get the unique items count.
    /// @return the uniqueItemsCount address.
    function getUniqueItemsCount() external view returns (uint256) {
        return uniqueItemsCount;
    }

    /// @notice Get the token id uri.
    /// @return string token uri.
    function uri(
        uint256 _tokenId
    ) public view override returns (string memory) {
        require(_tokenId <= uniqueItemsCount, "Token id doesn't exist");

        string memory base = _baseURI;
        return string(abi.encodePacked(base, _tokenId.toString()));
    }

    // ------------- Setters ------------- //
    /// @notice Set the mintingMaintainer that will have the authority to sign mint messages.
    /// @param _mintingMaintainer New mintingMaintainer address.
    /// @dev in practice the private key is only known by the backend.
    function setMintingMaintainer(
        address _mintingMaintainer
    ) external onlyRole(MAINTAINER_ROLE) {
        emit MaintenanceTransferred(mintingMaintainer, _mintingMaintainer);
        mintingMaintainer = _mintingMaintainer;
    }

    function setURI(string memory _newuri) external onlyRole(ID_ADDER_ROLE) {
        _baseURI = _newuri;
    }

    function setMaxSupply(
        uint256 _tokenId,
        uint256 _supply
    ) external onlyRole(ID_ADDER_ROLE) {
        maxSupply[_tokenId] = _supply;
    }

    function incrementUniqueItemsCount() external onlyRole(ID_ADDER_ROLE) {
        uniqueItemsCount++;
    }

    /// @notice Pauses the contract functionality.
    /// @dev ERC1155Pausable function.
    function pause() external onlyRole(PAUSE_ROLE) {
        _pause();
    }

    /// @notice Unpauses the contract functionality.
    /// @dev ERC1155Pausable function.
    function unpause() external onlyRole(PAUSE_ROLE) {
        _unpause();
    }

    function mint(
        bytes calldata _mintingMaintainerSignedMsg,
        MintingParams calldata _mintingParams
    ) external {
        uint tokenId = _mintingParams.tokenId;
        uint amount = _mintingParams.amount;
        require(tokenId <= uniqueItemsCount, "Token id doesn't exist");
        require(
            maxSupply[tokenId] == 0 ||
                totalSupply(tokenId) + amount <= maxSupply[tokenId],
            "Exceeds max supply"
        );
        require(
            !verifiedMessages[_mintingMaintainerSignedMsg],
            "This message has already been executed!"
        );

        verifiedMessages[_mintingMaintainerSignedMsg] = true;

        // Hash the message
        bytes32 digest = _hashTypedDataV4(
            keccak256(_constructMintingMessage(_mintingParams))
        );

        // Verify the message
        require(
            mintingMaintainer ==
                ECDSA.recover(digest, _mintingMaintainerSignedMsg),
            "Maintainer did not sign this message!"
        );

        _mint(msg.sender, _mintingParams.tokenId, _mintingParams.amount, "");
    }

    function mintBatch(
        bytes calldata _mintingMaintainerSignedMsg,
        BatchMintingParams calldata _mintingParams
    ) external {
        for (uint256 i = 0; i < _mintingParams.tokenIds.length; i++) {
            uint256 tokenId = _mintingParams.tokenIds[i];
            uint256 amount = _mintingParams.amounts[i];

            require(tokenId <= uniqueItemsCount, "Token id doesn't exist");
            require(
                maxSupply[tokenId] == 0 ||
                    totalSupply(tokenId) + amount <= maxSupply[tokenId],
                "Exceeds max supply"
            );
        }
        require(
            !verifiedMessages[_mintingMaintainerSignedMsg],
            "This message has already been executed!"
        );

        verifiedMessages[_mintingMaintainerSignedMsg] = true;

        // Hash the message
        bytes32 digest = _hashTypedDataV4(
            keccak256(_constructBatchMintingMessage(_mintingParams))
        );

        // Verify the message
        require(
            mintingMaintainer ==
                ECDSA.recover(digest, _mintingMaintainerSignedMsg),
            "Maintainer did not sign this message!"
        );
        _mintBatch(
            msg.sender,
            _mintingParams.tokenIds,
            _mintingParams.amounts,
            ""
        );
    }

    // ------------- Internal ------------- //

    /// @notice Reconstruct the mint message without hashing.
    /// @param _mintingParams necessary data for proper message reconstruction.
    /// @return the newly packed message as bytes32.
    /// @dev Follows EIP712 standard.
    function _constructMintingMessage(
        MintingParams calldata _mintingParams
    ) internal pure returns (bytes memory) {
        return
            abi.encode(
                MINT_TYPE_HASH,
                _mintingParams.tokenId,
                _mintingParams.amount,
                _mintingParams.salt
            );
    }

    /// @notice Reconstruct the mint batch message without hashing.
    /// @param _mintingParams necessary data for proper message reconstruction.
    /// @dev Follows EIP712 standard.
    /// @return the newly packed message as bytes.
    function _constructBatchMintingMessage(
        BatchMintingParams memory _mintingParams
    ) internal pure returns (bytes memory) {
        return
            abi.encodePacked(
                BATCH_MINT_TYPE_HASH,
                keccak256(abi.encodePacked(_mintingParams.tokenIds)),
                keccak256(abi.encodePacked(_mintingParams.amounts)),
                _mintingParams.salt
            );
    }

    // The following functions are overrides required by Solidity.

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControl, ERC1155, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Pausable, ERC1155Supply) {
        super._update(from, to, ids, values);
    }
}
