// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract Runner2060coin is
    ERC20,
    ERC20Burnable,
    ERC20Pausable,
    AccessControl,
    EIP712
{
    // Struct with minting params
    struct MintingParams {
        uint256 amount;
        bytes32 salt;
        address userAddress;
    }

    // EIP712 message type hash.
    bytes32 constant MINT_TYPE_HASH =
        keccak256(
            "MintingParams(uint256 amount,bytes32 salt,address userAddress)"
        );

    // signed message => bool verified
    mapping(bytes => bool) verifiedMessages;
    address mintingMaintainer;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    event MaintenanceTransferred(address maintainer, address newMaintainer);

    constructor(
        address _mintingMaintainerAddress,
        address defaultAdmin,
        address admin
    ) ERC20("Runner2060coin", "SuRun") EIP712("Runner2060coin", "V1") {
        mintingMaintainer = _mintingMaintainerAddress;
        _grantRole(DEFAULT_ADMIN_ROLE, defaultAdmin);
        _grantRole(ADMIN_ROLE, admin);
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
    ) external onlyRole(ADMIN_ROLE) {
        emit MaintenanceTransferred(mintingMaintainer, _mintingMaintainer);
        mintingMaintainer = _mintingMaintainer;
    }

    /// @notice Pauses the contract functionality.
    /// @dev ERC20Pausable function.
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /// @notice Unpauses the contract functionality.
    /// @dev ERC20Pausable function.
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /// @notice Mint a ERC20 token by admin.
    /// @param _to The address to which the tokens will be minted.
    /// @param _amount The amount of minted tokens.
    function mintByAdmin(
        address _to,
        uint256 _amount
    ) external onlyRole(ADMIN_ROLE) {
        _mint(_to, _amount);
    }

    /// @notice Burn a ERC20 token by admin.
    /// @param _from The address from which the tokens will be burned.
    /// @param _amount The amount of burned tokens.
    function burnByAdmin(
        address _from,
        uint256 _amount
    ) external onlyRole(ADMIN_ROLE) {
        _burn(_from, _amount);
    }

    /// @notice Mint a ERC20 token by user.
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
            keccak256(_constructMintingMessage(_mintingParams))
        );

        // Verify the message
        require(
            mintingMaintainer ==
                ECDSA.recover(digest, _mintingMaintainerSignedMsg),
            "Maintainer did not sign this message!"
        );

        _mint(_mintingParams.userAddress, _mintingParams.amount);
    }

    /// @notice Reconstruct the message without hashing.
    /// @param _mintingParams necessary data for proper message reconstruction.
    /// @return the newly packed message as bytes32.
    /// @dev Follows EIP712 standard.
    function _constructMintingMessage(
        MintingParams calldata _mintingParams
    ) internal pure returns (bytes memory) {
        return
            abi.encode(
                MINT_TYPE_HASH,
                _mintingParams.amount,
                _mintingParams.salt,
                _mintingParams.userAddress
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
