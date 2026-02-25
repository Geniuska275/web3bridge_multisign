const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MultiSigWallet", function () {

  let wallet;
  let owner1, owner2, owner3, user;

  beforeEach(async function () {
    [owner1, owner2, owner3, user] = await ethers.getSigners();

    const MultiSigWallet = await ethers.getContractFactory("MultiSigWallet");

    wallet = await MultiSigWallet.deploy([
      owner1.address,
      owner2.address,
      owner3.address
    ]);

    await wallet.waitForDeployment();
  });


  it("Should set correct owners", async function () {
    expect(await wallet.isOwner(owner1.address)).to.equal(true);
    expect(await wallet.isOwner(owner2.address)).to.equal(true);
    expect(await wallet.isOwner(owner3.address)).to.equal(true);
  });


  it("Anyone can deposit ETH", async function () {
    await user.sendTransaction({
      to: wallet.target,
      value: ethers.parseEther("1")
    });

    const balance = await ethers.provider.getBalance(wallet.target);
    expect(balance).to.equal(ethers.parseEther("1"));
  });

  /*//////////////////////////////////////////////////////////////
                      SUBMIT TRANSACTION
  //////////////////////////////////////////////////////////////*/

  it("Owner can submit transaction", async function () {
    await wallet.connect(owner1)
      .submitTransaction(user.address, ethers.parseEther("1"));

    expect(await wallet.getTransactionCount()).to.equal(1);
  });

  it("Non-owner cannot submit transaction", async function () {
    await expect(
      wallet.connect(user)
        .submitTransaction(user.address, ethers.parseEther("1"))
    ).to.be.revertedWith("Not owner");
  });

  /*//////////////////////////////////////////////////////////////
                  EXECUTION NEEDS 3 APPROVALS
  //////////////////////////////////////////////////////////////*/

  it("Cannot execute with less than 3 approvals", async function () {

    // deposit ETH
    await user.sendTransaction({
      to: wallet.target,
      value: ethers.parseEther("3")
    });

    // submit tx
    await wallet.connect(owner1)
      .submitTransaction(user.address, ethers.parseEther("1"));

    // 2 approvals
    await wallet.connect(owner1).approveTransaction(0);
    await wallet.connect(owner2).approveTransaction(0);

    await expect(
      wallet.connect(owner1).executeTransaction(0)
    ).to.be.revertedWith("Need 3 approvals");
  });

  /*//////////////////////////////////////////////////////////////
                      FULL EXECUTION FLOW
  //////////////////////////////////////////////////////////////*/

  it("Executes after 3 approvals", async function () {

    // deposit 3 ETH
    await user.sendTransaction({
      to: wallet.target,
      value: ethers.parseEther("3")
    });

    const initialBalance = await ethers.provider.getBalance(user.address);

    // submit tx
    await wallet.connect(owner1)
      .submitTransaction(user.address, ethers.parseEther("1"));

    // approvals
    await wallet.connect(owner1).approveTransaction(0);
    await wallet.connect(owner2).approveTransaction(0);
    await wallet.connect(owner3).approveTransaction(0);

  
    await wallet.connect(owner1).executeTransaction(0);

    const finalBalance = await ethers.provider.getBalance(user.address);
    const contractBalance = await ethers.provider.getBalance(wallet.target);

    expect(finalBalance).to.be.gt(initialBalance);
    expect(contractBalance).to.equal(ethers.parseEther("2"));
  });



  it("Owner cannot approve twice", async function () {

    await wallet.connect(owner1)
      .submitTransaction(user.address, ethers.parseEther("1"));

    await wallet.connect(owner1).approveTransaction(0);

    await expect(
      wallet.connect(owner1).approveTransaction(0)
    ).to.be.revertedWith("Already approved");
  });

});