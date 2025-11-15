import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { IncToken } from "../../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("IncToken", function () {
  // Fixture for deploying contracts
  async function deployIncTokenFixture() {
    const [owner, addr1, addr2, masterChef] = await ethers.getSigners();

    const IncToken = await ethers.getContractFactory("IncToken");
    const incToken = await IncToken.deploy();

    return { incToken, owner, addr1, addr2, masterChef };
  }

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      const { incToken } = await loadFixture(deployIncTokenFixture);

      expect(await incToken.name()).to.equal("INCUM");
      expect(await incToken.symbol()).to.equal("INCUM");
    });

    it("Should have 18 decimals", async function () {
      const { incToken } = await loadFixture(deployIncTokenFixture);
      expect(await incToken.decimals()).to.equal(18);
    });

    it("Should mint pre-sale amount to deployer address", async function () {
      const { incToken } = await loadFixture(deployIncTokenFixture);
      
      const preMintAddress = "0x3a1D1114269d7a786C154FE5278bF5b1e3e20d31";
      const expectedAmount = ethers.parseEther("37500"); // 37,500 INC
      
      const balance = await incToken.balanceOf(preMintAddress);
      expect(balance).to.equal(expectedAmount);
    });

    it("Should set deployer as initial owner", async function () {
      const { incToken, owner } = await loadFixture(deployIncTokenFixture);
      expect(await incToken.owner()).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    it("Should allow owner to mint tokens", async function () {
      const { incToken, owner, addr1 } = await loadFixture(deployIncTokenFixture);
      
      const mintAmount = ethers.parseEther("1000");
      await incToken.connect(owner).mint(addr1.address, mintAmount);
      
      expect(await incToken.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should not allow non-owner to mint tokens", async function () {
      const { incToken, addr1, addr2 } = await loadFixture(deployIncTokenFixture);
      
      const mintAmount = ethers.parseEther("1000");
      
      await expect(
        incToken.connect(addr1).mint(addr2.address, mintAmount)
      ).to.be.revertedWithCustomError(incToken, "OwnableUnauthorizedAccount");
    });

    it("Should correctly update total supply after minting", async function () {
      const { incToken, owner, addr1 } = await loadFixture(deployIncTokenFixture);
      
      const preMintAmount = ethers.parseEther("37500");
      const mintAmount = ethers.parseEther("1000");
      
      await incToken.connect(owner).mint(addr1.address, mintAmount);
      
      const totalSupply = await incToken.totalSupply();
      expect(totalSupply).to.equal(preMintAmount + mintAmount);
    });

    it("Should emit Transfer event on mint", async function () {
      const { incToken, owner, addr1 } = await loadFixture(deployIncTokenFixture);
      
      const mintAmount = ethers.parseEther("1000");
      
      await expect(incToken.connect(owner).mint(addr1.address, mintAmount))
        .to.emit(incToken, "Transfer")
        .withArgs(ethers.ZeroAddress, addr1.address, mintAmount);
    });
  });

  describe("Ownership", function () {
    it("Should allow owner to transfer ownership", async function () {
      const { incToken, owner, masterChef } = await loadFixture(deployIncTokenFixture);
      
      await incToken.connect(owner).transferOwnership(masterChef.address);
      expect(await incToken.owner()).to.equal(masterChef.address);
    });

    it("Should not allow non-owner to transfer ownership", async function () {
      const { incToken, addr1, addr2 } = await loadFixture(deployIncTokenFixture);
      
      await expect(
        incToken.connect(addr1).transferOwnership(addr2.address)
      ).to.be.revertedWithCustomError(incToken, "OwnableUnauthorizedAccount");
    });

    it("Should allow new owner to mint after ownership transfer", async function () {
      const { incToken, owner, masterChef, addr1 } = await loadFixture(deployIncTokenFixture);
      
      // Transfer ownership to masterChef
      await incToken.connect(owner).transferOwnership(masterChef.address);
      
      // MasterChef should now be able to mint
      const mintAmount = ethers.parseEther("1000");
      await incToken.connect(masterChef).mint(addr1.address, mintAmount);
      
      expect(await incToken.balanceOf(addr1.address)).to.equal(mintAmount);
    });

    it("Should prevent old owner from minting after ownership transfer", async function () {
      const { incToken, owner, masterChef, addr1 } = await loadFixture(deployIncTokenFixture);
      
      // Transfer ownership to masterChef
      await incToken.connect(owner).transferOwnership(masterChef.address);
      
      // Old owner should not be able to mint
      const mintAmount = ethers.parseEther("1000");
      await expect(
        incToken.connect(owner).mint(addr1.address, mintAmount)
      ).to.be.revertedWithCustomError(incToken, "OwnableUnauthorizedAccount");
    });
  });

  describe("ERC20 Functionality", function () {
    it("Should transfer tokens between accounts", async function () {
      const { incToken, owner, addr1, addr2 } = await loadFixture(deployIncTokenFixture);
      
      const mintAmount = ethers.parseEther("1000");
      await incToken.connect(owner).mint(addr1.address, mintAmount);
      
      const transferAmount = ethers.parseEther("500");
      await incToken.connect(addr1).transfer(addr2.address, transferAmount);
      
      expect(await incToken.balanceOf(addr1.address)).to.equal(mintAmount - transferAmount);
      expect(await incToken.balanceOf(addr2.address)).to.equal(transferAmount);
    });

    it("Should fail to transfer more tokens than available", async function () {
      const { incToken, owner, addr1, addr2 } = await loadFixture(deployIncTokenFixture);
      
      const mintAmount = ethers.parseEther("1000");
      await incToken.connect(owner).mint(addr1.address, mintAmount);
      
      const transferAmount = ethers.parseEther("1001");
      await expect(
        incToken.connect(addr1).transfer(addr2.address, transferAmount)
      ).to.be.reverted;
    });

    it("Should update allowances correctly", async function () {
      const { incToken, owner, addr1, addr2 } = await loadFixture(deployIncTokenFixture);
      
      const mintAmount = ethers.parseEther("1000");
      await incToken.connect(owner).mint(addr1.address, mintAmount);
      
      const approveAmount = ethers.parseEther("500");
      await incToken.connect(addr1).approve(addr2.address, approveAmount);
      
      expect(await incToken.allowance(addr1.address, addr2.address)).to.equal(approveAmount);
    });

    it("Should allow transferFrom with proper allowance", async function () {
      const { incToken, owner, addr1, addr2 } = await loadFixture(deployIncTokenFixture);
      
      const mintAmount = ethers.parseEther("1000");
      await incToken.connect(owner).mint(addr1.address, mintAmount);
      
      const approveAmount = ethers.parseEther("500");
      await incToken.connect(addr1).approve(addr2.address, approveAmount);
      
      const transferAmount = ethers.parseEther("300");
      await incToken.connect(addr2).transferFrom(addr1.address, addr2.address, transferAmount);
      
      expect(await incToken.balanceOf(addr2.address)).to.equal(transferAmount);
      expect(await incToken.allowance(addr1.address, addr2.address)).to.equal(approveAmount - transferAmount);
    });
  });
});
