// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

contract BatchPayer {
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function batchPay(address[] calldata recipients, uint256[] calldata amounts)
        external
        payable
        onlyOwner
    {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        uint256 total = 0;
        for (uint256 i = 0; i < recipients.length; i++) {
            total += amounts[i];
            (bool sent, ) = recipients[i].call{value: amounts[i]}("");
            require(sent, "Transfer failed");
        }
        require(msg.value >= total, "Insufficient USDC sent");
    }

    // Allow contract to receive USDC
    receive() external payable {}
}
