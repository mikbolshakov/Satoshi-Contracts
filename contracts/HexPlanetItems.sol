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

/// @title HexPlanetItems
/// @dev A smart contract for managing ERC1155 tokens with minting, pausing and supply control functionality.
contract HexPlanetItems is
    ERC1155,
    AccessControl,
    ERC1155Pausable,
    ERC1155Supply,
    ERC2981,
    EIP712
{
    using Strings for uint256;

    /// @dev Struct defining minting parameters
    struct MintingParams {
        uint256 tokenId; // Token ID to mint
        uint256 amount; // Amount of tokens to mint
        bytes32 salt; // Salt value for uniqueness
    }

    /// @dev Struct defining batch minting parameters
    struct BatchMintingParams {
        uint256[] tokenIds; // Array of token IDs to mint
        uint256[] amounts; // Array of amounts corresponding to each token ID
        bytes32 salt; // Salt value for uniqueness
    }

    // EIP712 message type hash for single token minting
    bytes32 constant MINT_TYPE_HASH =
        keccak256("MintingParams(uint256 tokenId,uint256 amount,bytes32 salt)");

    // EIP712 message type hash for batch token minting
    bytes32 constant BATCH_MINT_TYPE_HASH =
        keccak256(
            "BatchMintingParams(uint256[] tokenIds,uint256[] amounts,bytes32 salt)"
        );

    // signed message => bool verified
    mapping(bytes => bool) verifiedMessages;
    // token id => max supply
    mapping(uint256 => uint256) maxSupply;

    address mintingMaintainer;
    uint256 uniqueItemsCount;
    string _baseURI;

    // Role constants
    bytes32 public constant PAUSE_ROLE = keccak256("PAUSE_ROLE");
    bytes32 public constant MAINTAINER_ROLE = keccak256("MAINTAINER_ROLE");
    bytes32 public constant TOKEN_ADMIN_ROLE = keccak256("TOKEN_ADMIN_ROLE");

    event MaintenanceTransferred(address maintainer, address newMaintainer);

    /// @notice Constructor to initialize the contract.
    /// @param _mintingMaintainerAddress Address of the minting maintainer.
    /// @param _royaltyReceiver Address of the royalty receiver.
    /// @param _feeNumerator Numerator of the royalty fee.
    /// @param _defaultAdmin Address of the default admin.
    constructor(
        address _mintingMaintainerAddress,
        address _royaltyReceiver,
        uint96 _feeNumerator,
        address _defaultAdmin
    ) ERC1155("") EIP712("HexPlanetItems", "V1") {
        mintingMaintainer = _mintingMaintainerAddress;
        _setDefaultRoyalty(_royaltyReceiver, _feeNumerator);
        _grantRole(DEFAULT_ADMIN_ROLE, _defaultAdmin);
        _grantRole(PAUSE_ROLE, _defaultAdmin);
        _grantRole(MAINTAINER_ROLE, _defaultAdmin);
        _grantRole(TOKEN_ADMIN_ROLE, _defaultAdmin);
    }

    // ------------- Getters ------------- //
    /// @notice Get the address of the minting maintainer.
    /// @return Address of the minting maintainer.
    function getMintingMaintainer() external view returns (address) {
        return mintingMaintainer;
    }

    /// @notice Get the count of unique items.
    /// @return Count of unique items.
    function getUniqueItemsCount() external view returns (uint256) {
        return uniqueItemsCount;
    }

    /// @notice Get the max supply of token id.
    /// @param _tokenId The ID of the token.
    /// @return Max supply of the token ID.
    function getMaxSupply(uint256 _tokenId) external view returns (uint256) {
        return maxSupply[_tokenId];
    }

    /// @notice Get the URI of a token.
    /// @param _tokenId ID of the token.
    /// @return URI of the token.
    function uri(
        uint256 _tokenId
    ) public view override returns (string memory) {
        require(_tokenId <= uniqueItemsCount, "Token id doesn't exist");

        string memory base = _baseURI;
        return string(abi.encodePacked(base, _tokenId.toString()));
    }

    // ------------- Setters ------------- //
    /// @notice Set the mintingMaintainer address that will have the authority to sign mint messages.
    /// @param _mintingMaintainer Address of the new minting maintainer.
    /// @dev The private key is only known by the backend.
    function setMintingMaintainer(
        address _mintingMaintainer
    ) external onlyRole(MAINTAINER_ROLE) {
        emit MaintenanceTransferred(mintingMaintainer, _mintingMaintainer);
        mintingMaintainer = _mintingMaintainer;
    }

    /// @notice Set the base URI for all token IDs.
    /// @param _newuri The new base URI.
    function setURI(string memory _newuri) external onlyRole(TOKEN_ADMIN_ROLE) {
        _baseURI = _newuri;
    }

    /// @notice Set the maximum supply for a given token ID.
    /// @param _tokenId ID of the token.
    /// @param _supply Maximum supply of the token.
    function setMaxSupply(
        uint256 _tokenId,
        uint256 _supply
    ) external onlyRole(TOKEN_ADMIN_ROLE) {
        maxSupply[_tokenId] = _supply;
    }

    /// @notice Increment the count of unique items.
    function incrementUniqueItemsCount() external onlyRole(TOKEN_ADMIN_ROLE) {
        uniqueItemsCount++;
    }

    /// @notice Pause the contract functionality.
    /// @dev ERC1155Pausable function.
    function pause() external onlyRole(PAUSE_ROLE) {
        _pause();
    }

    /// @notice Unpause the contract functionality.
    /// @dev ERC1155Pausable function.
    function unpause() external onlyRole(PAUSE_ROLE) {
        _unpause();
    }

    /// @notice Mint a single token.
    /// @param _mintingMaintainerSignedMsg Signed message from the minting maintainer.
    /// @param _mintingParams Minting parameters used to reconstruct the message, necessary to validate signature.
    /// @dev _mintingMaintainerSignedMsg is taken from the backend.
    /// @dev Using EIP712 signatures.
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

    /// @notice Mint multiple tokens in a single transaction.
    /// @param _mintingMaintainerSignedMsg Signed message from the minting maintainer.
    /// @param _mintingParams Batch minting parameters used to reconstruct the message, necessary to validate signature.
    /// @dev _mintingMaintainerSignedMsg is taken from the backend.
    /// @dev Using EIP712 signatures.
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
    /// @param _mintingParams Necessary data for proper message reconstruction.
    /// @return The newly packed message as bytes.
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
    /// @param _mintingParams Necessary data for proper message reconstruction.
    /// @return The newly packed message as bytes.
    /// @dev Follows EIP712 standard.
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
    /// @inheritdoc ERC1155
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(AccessControl, ERC1155, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    /// @inheritdoc ERC1155
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Pausable, ERC1155Supply) {
        super._update(from, to, ids, values);
    }
}
