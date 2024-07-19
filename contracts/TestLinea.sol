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

contract TestLinea is
    Ownable,
    ERC1155,
    ERC1155Pausable,
    ERC1155Supply,
    ERC1155Burnable,
    ERC2981,
    EIP712
{
    using Strings for uint256;

    struct MintingParams {
        uint256 tokenId;
        uint256 amount;
        bytes32 salt;
    }

    struct BatchMintingParams {
        uint256[] tokenIds;
        uint256[] amounts;
        bytes32 salt;
    }

    bytes32 constant MINT_TYPE_HASH =
        keccak256("MintingParams(uint256 tokenId,uint256 amount,bytes32 salt)");

    bytes32 constant BATCH_MINT_TYPE_HASH =
        keccak256("BatchMintingParams(uint256[] tokenIds,uint256[] amounts,bytes32 salt)");

    mapping(bytes => bool) verifiedMessages;
    mapping(uint256 => uint256) maxSupply;

    string _baseURI;
    string _baseExtension = ".json";
    string public constant name = "TestLineea1155";
    string public constant symbol = "TL1155";
    bool public transferStopped;
    address public mintingMaintainer;

    event MaintenanceTransferred(address maintainer, address newMaintainer);

    constructor(
        address _mintingMaintainerAddress,
        address _royaltyReceiver,
        uint96 _feeNumerator,
        address _delegate
    ) ERC1155("") Ownable(_delegate) EIP712("TestLineea1155", "V1") {
        mintingMaintainer = _mintingMaintainerAddress;
        _setDefaultRoyalty(_royaltyReceiver, _feeNumerator);
        transferStopped = true;
    }

    function getMaxSupply(uint256 _tokenId) external view returns (uint256) {
        return maxSupply[_tokenId];
    }

    function uri(uint256 _tokenId) public view override returns (string memory) {
        string memory base = _baseURI;
        string memory extension = _baseExtension;
        return string(abi.encodePacked(base, _tokenId.toString(), extension));
    }

    function setMintingMaintainer(address _mintingMaintainer) external onlyOwner {
        emit MaintenanceTransferred(mintingMaintainer, _mintingMaintainer);
        mintingMaintainer = _mintingMaintainer;
    }

    function setURI(string memory _newuri) external onlyOwner {
        _baseURI = _newuri;
    }

    function setMaxSupply(uint256 _tokenId, uint256 _supply) external onlyOwner {
        maxSupply[_tokenId] = _supply;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function disableTransfer() external onlyOwner {
        transferStopped = true;
    }

    function enableTransfer() external onlyOwner {
        transferStopped = false;
    }

    function mintAdmin(address _to, uint256 _tokenId, uint256 _amount) external onlyOwner {
        _mint(_to, _tokenId, _amount, "");
    }

    function burnAdmin(address _from, uint256 _tokenId, uint256 _amount) external onlyOwner {
        _burn(_from, _tokenId, _amount);
    }

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

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC1155, ERC2981) returns (bool) {
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

    function burn(address account, uint256 id, uint256 value) public override onlyOwner {
        super.burn(account, id, value);
    }

    function burnBatch(
        address account,
        uint256[] memory ids,
        uint256[] memory values
    ) public override onlyOwner {
        super.burnBatch(account, ids, values);
    }
}
