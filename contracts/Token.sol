// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, ERC20Pausable, Ownable, EIP712 {
    struct MintingParams {
        address user;
        uint256 amount;
        bytes32 hash;
    }

    // EIP712 message type hash.
    bytes32 constant MINT_TYPE_HASH =
        keccak256("MintingParams(address user,uint256 amount,bytes32 hash)");

    mapping(bytes => bool) verifiedMessages;
    address mintingMaintainer;

    event MaintenanceTransferred(address maintainer, address newMaintainer);

    constructor(
        address _initialOwner,
        address _mintingMaintainerAddress
    )
        ERC20("MyToken", "MTK")
        Ownable(_initialOwner)
        EIP712("Runner2060", "V1")
    {
        mintingMaintainer = _mintingMaintainerAddress;
    }

    // ------------- Getters ------------- //
    /// @notice Get the mintingMaintainer address.
    /// @return the mintingMaintainer address.
    function getMintingMaintainer() external view returns (address) {
        return mintingMaintainer;
    }

    // ------------- Setters ------------- //
    /// @notice Set the mintingMaintainer that will have the authority to sign mint messages.
    /// @param _mintingMaintainer New mintingMaintainer address.
    /// @dev in practice the private key is only known by the backend.
    function setMintingMaintainer(
        address _mintingMaintainer
    ) external onlyOwner {
        emit MaintenanceTransferred(mintingMaintainer, _mintingMaintainer);
        mintingMaintainer = _mintingMaintainer;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    /// @notice Mint a ERC20 token.
    /// @param _mintingMaintainerSignedMsg The message signed by the `mintingMaintainer`.
    /// @param _mintingParams The data used to reconstruct the message, necessary to validate signature.
    /// @dev Using EIP712 signatures.
    function mint(
        bytes calldata _mintingMaintainerSignedMsg,
        MintingParams calldata _mintingParams
    ) external {
        require(
            !verifiedMessages[_mintingMaintainerSignedMsg],
            "This message has already been executed!"
        );

        verifiedMessages[_mintingMaintainerSignedMsg] = true;

        // Hash the message
        bytes32 digest = _hashTypedDataV4(
            _constructMintingMessage(_mintingParams)
        );

        // Verify the message
        require(
            mintingMaintainer ==
                ECDSA.recover(digest, _mintingMaintainerSignedMsg),
            "Maintainer did not sign this message!"
        );

        _mint(_mintingParams.user, _mintingParams.amount);
    }

    /// @notice Reconstruct the message with hashing.
    /// @param _mintingParams necessary data for proper message reconstruction.
    /// @return the newly packed message as bytes32.
    /// @dev Follows EIP712 standard.
    function _constructMintingMessage(
        MintingParams calldata _mintingParams
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    MINT_TYPE_HASH,
                    _mintingParams.user,
                    _mintingParams.amount,
                    _mintingParams.hash
                )
            );
    }

    // The following functions are overrides required by Solidity.

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }
}
