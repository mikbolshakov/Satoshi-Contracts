// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import { OApp, MessagingFee, Origin } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OAppSender.sol";

interface IRunner2060rewards {
    function mintAdmin(address _to, uint256 _tokenId, uint256 _amount) external;

    function burnAdmin(address _from, uint256 _tokenId, uint256 _amount) external;
}

contract FirstThirdPartyOmni is Ownable, OApp {
    address public runner2060rewardsAddress;

    constructor(
        address _endpoint,
        address _delegate,
        address _runner2060rewardsAddress
    ) OApp(_endpoint, _delegate) Ownable(_delegate) {
        runner2060rewardsAddress = _runner2060rewardsAddress;
    }

    function send(
        uint32 _dstEid,
        address _from,
        bytes32 _to,
        uint256 _tokenId,
        uint256 _amount,
        bytes calldata _options
    ) external payable returns (MessagingReceipt memory receipt) {
        IRunner2060rewards(runner2060rewardsAddress).burnAdmin(_from, _tokenId, _amount);

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

        IRunner2060rewards(runner2060rewardsAddress).mintAdmin(
            address(uint160(uint256(_to))),
            _tokenId,
            _amount
        );
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
}
