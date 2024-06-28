// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/OFT.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Runner2060coin
/// @dev A smart contract for managing ERC20 tokens with minting, burning and pausing functionality.
contract Runner2060coin is OFT, ERC20Burnable, ERC20Pausable, EIP712 {
    /// @dev Struct defining minting parameters
    struct MintingParams {
        address userAddress; // Address to which tokens to mint
        uint256 amount; // Amount of tokens to mint
        bytes32 salt; // Salt value for uniqueness
    }

    // EIP712 message type hash for single token minting
    bytes32 constant MINT_TYPE_HASH =
        keccak256("MintingParams(address userAddress,uint256 amount,bytes32 salt)");

    // signed message => bool verified
    mapping(bytes => bool) verifiedMessages;
    bool public transferStopped;
    address public mintingMaintainer;

    event MaintenanceTransferred(address maintainer, address newMaintainer);

    /// @notice Constructor to initialize the contract.
    /// @param _mintingMaintainerAddress Address of the minting maintainer.
    /// @param _lzEndpoint The LayerZero Endpoint on the chain.
    /// @param _delegate The delegate capable of making OApp configurations inside of the endpoint.
    constructor(
        address _mintingMaintainerAddress,
        address _lzEndpoint,
        address _delegate
    )
        OFT("Runner2060coin", "SuRun", _lzEndpoint, _delegate)
        Ownable(_delegate)
        EIP712("Runner2060coin", "V1")
    {
        mintingMaintainer = _mintingMaintainerAddress;
        transferStopped = true;
    }

    // ------------- Setters ------------- //
    /// @notice Set the mintingMaintainer address that will have the authority to sign mint messages.
    /// @param _mintingMaintainer Address of the new minting maintainer.
    /// @dev The private key is only known by the backend.
    function setMintingMaintainer(address _mintingMaintainer) external onlyOwner {
        emit MaintenanceTransferred(mintingMaintainer, _mintingMaintainer);
        mintingMaintainer = _mintingMaintainer;
    }

    /// @notice Pause the contract functionality.
    /// @dev ERC20Pausable function.
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Unpause the contract functionality.
    /// @dev ERC20Pausable function.
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

    /// @notice Mint ERC20 tokens by admin.
    /// @param _to The address to which the tokens will be minted.
    /// @param _amount The amount of tokens to mint.
    function mintAdmin(address _to, uint256 _amount) external onlyOwner {
        _mint(_to, _amount);
    }

    /// @notice Burn ERC20 tokens by admin.
    /// @param _from The address from which the tokens will be burned.
    /// @param _amount The amount of tokens to burn.
    function burnAdmin(address _from, uint256 _amount) external onlyOwner {
        _burn(_from, _amount);
    }

    /// @notice Mint a ERC20 token by user.
    /// @param _mintingMaintainerSignedMsg The message signed by the `mintingMaintainer`.
    /// @param _mintingParams Minting parameters used to reconstruct the message, necessary to validate signature.
    /// @dev _mintingMaintainerSignedMsg is taken from the backend.
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
        bytes32 digest = _hashTypedDataV4(keccak256(_constructMintingMessage(_mintingParams)));

        // Verify the message
        require(
            mintingMaintainer == ECDSA.recover(digest, _mintingMaintainerSignedMsg),
            "Maintainer did not sign this message!"
        );

        _mint(_mintingParams.userAddress, _mintingParams.amount);
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
                _mintingParams.userAddress,
                _mintingParams.amount,
                _mintingParams.salt
            );
    }

    // The following functions are overrides required by Solidity.
    /// @inheritdoc ERC20
    function _update(
        address from,
        address to,
        uint256 value
    ) internal override(ERC20, ERC20Pausable) {
        super._update(from, to, value);
    }

    /// @inheritdoc ERC20
    function transfer(address to, uint256 value) public override returns (bool) {
        require(!transferStopped || msg.sender == owner(), "Enable token transfers functionality!");

        super.transfer(to, value);
        return true;
    }

    /// @inheritdoc ERC20
    function transferFrom(address from, address to, uint256 value) public override returns (bool) {
        require(!transferStopped || msg.sender == owner(), "Enable token transfers functionality!");

        super.transferFrom(from, to, value);
        return true;
    }

    // /// @inheritdoc ERC20
    // function approve(address spender, uint256 value) public override returns (bool) {
    //     require(!transferStopped || msg.sender == owner(), "Enable token transfers functionality!");

    //     super.approve(spender, value);
    //     return true;
    // }

    // /// @inheritdoc ERC20
    // function _approve(
    //     address _owner,
    //     address spender,
    //     uint256 value,
    //     bool emitEvent
    // ) internal override {
    //     require(!transferStopped || msg.sender == owner(), "Enable token transfers functionality!");

    //     super._approve(_owner, spender, value, emitEvent);
    // }

    // /// @inheritdoc ERC20
    // function _spendAllowance(address _owner, address spender, uint256 value) internal override {
    //     require(!transferStopped || msg.sender == owner(), "Enable token transfers functionality!");

    //     super._spendAllowance(_owner, spender, value);
    // }

    /// @inheritdoc ERC20Burnable
    function burn(uint256 value) public override onlyOwner {
        super.burn(value);
    }

    /// @inheritdoc ERC20Burnable
    function burnFrom(address to, uint256 value) public override onlyOwner {
        super.burnFrom(to, value);
    }
}
