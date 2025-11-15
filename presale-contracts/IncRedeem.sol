// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "../contracts/libs/IERC20.sol";

import "./PIncToken.sol";

contract IncRedeem is Ownable, ReentrancyGuard {

    // Burn address
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    PIncToken public pinc;
    address public incAddress;

    uint256 public startBlock;

    bool public hasBurnedUnsoldPresale = false;

    event incSwap(address sender, uint256 amount);
    event burnUnclaimedInc(uint256 amount);
    event startBlockChanged(uint256 newStartBlock);

    constructor(uint256 _startBlock, address _pincAddress, address _incAddress) Ownable(msg.sender) {
        require(_pincAddress != _incAddress, "pinc cannot be equal to inc");
        startBlock   = _startBlock;
        pinc = PIncToken(_pincAddress);
        incAddress  = _incAddress;
    }

    function swapPIncForInc(uint256 swapAmount) external nonReentrant {
        require(block.number >= startBlock, "inc redemption hasn't started yet, good things come to those that wait ;)");
        require(IERC20(incAddress).balanceOf(address(this)) >= swapAmount, "Not Enough tokens in contract for swap");
        pinc.transferFrom(msg.sender, BURN_ADDRESS, swapAmount);
        IERC20(incAddress).transfer(msg.sender, swapAmount);

        emit incSwap(msg.sender, swapAmount);
    }

    function sendUnclaimedIncToDeadAddress() external onlyOwner {
        require(block.number > pinc.endBlock(), "can only send excess inc to dead address after presale has ended");
        require(!hasBurnedUnsoldPresale, "can only burn unsold presale once!");

        require(pinc.pincRemaining() <= IERC20(incAddress).balanceOf(address(this)),
            "burning too much incum, founders may need to top up");

        if (pinc.pincRemaining() > 0)
            IERC20(incAddress).transfer(BURN_ADDRESS, pinc.pincRemaining());
        hasBurnedUnsoldPresale = true;

        emit burnUnclaimedInc(pinc.pincRemaining());
    }

    function setStartBlock(uint256 _newStartBlock) external onlyOwner {
        require(block.number < startBlock, "cannot change start block if sale has already commenced");
        require(block.number < _newStartBlock, "cannot set start block in the past");
        startBlock = _newStartBlock;

        emit startBlockChanged(_newStartBlock);
    }
}