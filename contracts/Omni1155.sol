// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OAppCore.sol";
import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OAppReceiver.sol";
import "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OAppSender.sol";

contract Omni1155 is
    Ownable,
    ERC1155,
    ERC1155Supply,
    ERC1155Burnable,
    OAppCore,
    OAppReceiver,
    OAppSender
{
    using Strings for uint256;

    string _baseURI;
    string _baseExtension = ".json";

    constructor(
        address _endpoint,
        address _delegate
    ) ERC1155("") OAppCore(_endpoint, _delegate) Ownable(_delegate) {}

    function uri(uint256 _tokenId) public view override returns (string memory) {
        string memory base = _baseURI;
        string memory extension = _baseExtension;
        return string(abi.encodePacked(base, _tokenId.toString(), extension));
    }

    function setURI(string memory _newuri) external onlyOwner {
        _baseURI = _newuri;
    }

    function mintAdmin(address _to, uint256 _tokenId, uint256 _amount) external onlyOwner {
        _mint(_to, _tokenId, _amount, "");
    }

    function burnAdmin(address _from, uint256 _tokenId, uint256 _amount) external onlyOwner {
        _burn(_from, _tokenId, _amount);
    }

    // The following functions are overrides required by Solidity.
    /// @inheritdoc ERC1155
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }

    function oAppVersion()
        public
        view
        override(IOAppCore, OAppReceiver, OAppSender)
        returns (uint64 senderVersion, uint64 receiverVersion)
    {}

    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address _executor,
        bytes calldata _extraData
    ) internal virtual override {}
}
