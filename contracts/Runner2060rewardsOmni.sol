// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Pausable.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import { OApp, MessagingFee, Origin } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OAppSender.sol";

/// @title Runner2060rewardsOmni
/// @dev A smart contract for managing ERC1155 tokens with minting, pausing, supply control and LayerZero Omnichain functionality.
contract Runner2060rewardsOmni is
    Ownable,
    ERC1155,
    ERC1155Pausable,
    ERC1155Supply,
    ERC1155Burnable,
    ERC2981,
    EIP712,
    OApp
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
        keccak256("BatchMintingParams(uint256[] tokenIds,uint256[] amounts,bytes32 salt)");

    // signed message => bool verified
    mapping(bytes => bool) verifiedMessages;
    // token id => max supply
    mapping(uint256 => uint256) maxSupply;

    string _baseURI;
    string _baseExtension = ".json";
    string public constant name = "Runner2060rewards";
    string public constant symbol = "SuRunRewards";
    bool public transferStopped;
    address public mintingMaintainer;

    event MaintenanceTransferred(address maintainer, address newMaintainer);

    /// @notice Constructor to initialize the contract.
    /// @param _mintingMaintainerAddress Address of the minting maintainer.
    /// @param _royaltyReceiver Address of the royalty receiver.
    /// @param _feeNumerator Numerator of the royalty fee.
    /// @param _endpoint LZ endpoint.
    /// @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
    constructor(
        address _mintingMaintainerAddress,
        address _royaltyReceiver,
        uint96 _feeNumerator,
        address _endpoint,
        address _delegate
    ) ERC1155("") OApp(_endpoint, _delegate) Ownable(_delegate) EIP712("Runner2060rewards", "V1") {
        mintingMaintainer = _mintingMaintainerAddress;
        _setDefaultRoyalty(_royaltyReceiver, _feeNumerator);
        transferStopped = true;
    }

    // ------------- Getters ------------- //
    /// @notice Get the max supply of token id.
    /// @param _tokenId The ID of the token.
    /// @return Max supply of the token ID.
    function getMaxSupply(uint256 _tokenId) external view returns (uint256) {
        return maxSupply[_tokenId];
    }

    /// @notice Get the URI of a token.
    /// @param _tokenId ID of the token.
    /// @return URI of the token.
    function uri(uint256 _tokenId) public view override returns (string memory) {
        string memory base = _baseURI;
        string memory extension = _baseExtension;
        return string(abi.encodePacked(base, _tokenId.toString(), extension));
    }

    // ------------- Setters ------------- //
    /// @notice Set the mintingMaintainer address that will have the authority to sign mint messages.
    /// @param _mintingMaintainer Address of the new minting maintainer.
    /// @dev The private key is only known by the backend.
    function setMintingMaintainer(address _mintingMaintainer) external onlyOwner {
        emit MaintenanceTransferred(mintingMaintainer, _mintingMaintainer);
        mintingMaintainer = _mintingMaintainer;
    }

    /// @notice Set the base URI for all token IDs.
    /// @param _newuri The new base URI.
    function setURI(string memory _newuri) external onlyOwner {
        _baseURI = _newuri;
    }

    /// @notice Set the maximum supply for a given token ID.
    /// @param _tokenId ID of the token.
    /// @param _supply Maximum supply of the token.
    function setMaxSupply(uint256 _tokenId, uint256 _supply) external onlyOwner {
        maxSupply[_tokenId] = _supply;
    }

    /// @notice Pause the contract functionality.
    /// @dev ERC1155Pausable function.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause the contract functionality.
    /// @dev ERC1155Pausable function.
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice Disable token transfers functionality.
    function disableTransfer() external onlyOwner {
        transferStopped = true;
    }

    /// @notice Enable token transfers functionality.
    function enableTransfer() external onlyOwner {
        transferStopped = false;
    }

    /// @notice Mint ERC1155 tokens by admin.
    /// @param _to The address to which the tokens will be minted.
    /// @param _tokenId The ID of the token to mint.
    /// @param _amount The amount of tokens to mint.
    function mintAdmin(address _to, uint256 _tokenId, uint256 _amount) external onlyOwner {
        _mint(_to, _tokenId, _amount, "");
    }

    /// @notice Burn ERC1155 tokens by admin.
    /// @param _from The address from which the tokens will be burned.
    /// @param _tokenId The ID of the token to burn.
    /// @param _amount The amount of tokens to burn.
    function burnAdmin(address _from, uint256 _tokenId, uint256 _amount) external onlyOwner {
        _burn(_from, _tokenId, _amount);
    }

    function send(
        uint32 _dstEid,
        bytes32 _to,
        uint256 _tokenId,
        uint256 _amount,
        bytes calldata _options
    ) external payable returns (MessagingReceipt memory receipt) {
        _burn(msg.sender, _tokenId, _amount);

        bytes memory _payload = abi.encode(_to, _tokenId, _amount);

        receipt = _lzSend(
            _dstEid,
            _payload,
            _options,
            MessagingFee(msg.value, 0),
            payable(msg.sender)
        );
    }

    function _lzReceive(
        Origin calldata,
        bytes32,
        bytes calldata payload,
        address,
        bytes calldata
    ) internal override {
        (bytes32 _to, uint256 _tokenId, uint256 _amount) = abi.decode(
            payload,
            (bytes32, uint256, uint256)
        );

        _mint(address(uint160(uint256(_to))), _tokenId, _amount, "");
    }

    function quote(
        uint32 _dstEid,
        bytes32 _to,
        uint256 _tokenId,
        uint256 _amount,
        bytes memory _options,
        bool _payInLzToken
    ) public view returns (MessagingFee memory fee) {
        bytes memory payload = abi.encode(_to, _tokenId, _amount);
        fee = _quote(_dstEid, payload, _options, _payInLzToken);
    }

    /// @notice Mint a ERC1155 single token by user.
    /// @param _mintingMaintainerSignedMsg The message signed by the mintingMaintainer.
    /// @param _mintingParams Minting parameters used to reconstruct the message, necessary to validate signature.
    /// @dev _mintingMaintainerSignedMsg is taken from the backend.
    /// @dev Using EIP712 signatures.
    function mint(
        bytes calldata _mintingMaintainerSignedMsg,
        MintingParams calldata _mintingParams
    ) external {
        uint tokenId = _mintingParams.tokenId;
        uint amount = _mintingParams.amount;
        require(
            maxSupply[tokenId] == 0 || totalSupply(tokenId) + amount <= maxSupply[tokenId],
            "Exceeds max supply"
        );
        require(
            !verifiedMessages[_mintingMaintainerSignedMsg],
            "This message has already been executed!"
        );

        verifiedMessages[_mintingMaintainerSignedMsg] = true;

        // Hash the message
        bytes32 digest = _hashTypedDataV4(keccak256(_constructMintingMessage(_mintingParams)));

        // Verify the message
        require(
            mintingMaintainer == ECDSA.recover(digest, _mintingMaintainerSignedMsg),
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

            require(
                maxSupply[tokenId] == 0 || totalSupply(tokenId) + amount <= maxSupply[tokenId],
                "Exceeds max supply"
            );
        }
        require(
            !verifiedMessages[_mintingMaintainerSignedMsg],
            "This message has already been executed!"
        );

        verifiedMessages[_mintingMaintainerSignedMsg] = true;

        // Hash the message
        bytes32 digest = _hashTypedDataV4(keccak256(_constructBatchMintingMessage(_mintingParams)));

        // Verify the message
        require(
            mintingMaintainer == ECDSA.recover(digest, _mintingMaintainerSignedMsg),
            "Maintainer did not sign this message!"
        );
        _mintBatch(msg.sender, _mintingParams.tokenIds, _mintingParams.amounts, "");
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
    ) public view override(ERC1155, ERC2981) returns (bool) {
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

    /// @inheritdoc ERC1155
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 value,
        bytes memory data
    ) public override {
        require(!transferStopped || msg.sender == owner(), "Enable token transfers functionality!");

        super.safeTransferFrom(from, to, id, value, data);
    }

    /// @inheritdoc ERC1155
    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values,
        bytes memory data
    ) public override {
        require(!transferStopped || msg.sender == owner(), "Enable token transfers functionality!");

        super.safeBatchTransferFrom(from, to, ids, values, data);
    }

    /// @inheritdoc ERC1155
    function setApprovalForAll(address operator, bool approved) public override {
        require(!transferStopped || msg.sender == owner(), "Enable token transfers functionality!");

        super.setApprovalForAll(operator, approved);
    }

    /// @inheritdoc ERC1155Burnable
    function burn(address account, uint256 id, uint256 value) public override onlyOwner {
        super.burn(account, id, value);
    }

    /// @inheritdoc ERC1155Burnable
    function burnBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory values
    ) public override onlyOwner {
        super.burnBatch(account, ids, values);
    }
}
