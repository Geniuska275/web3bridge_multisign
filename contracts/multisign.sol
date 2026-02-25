// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MultiSigWallet {

    event Deposit(address indexed sender, uint256 amount);
    event SubmitTransaction(uint256 indexed txId, address indexed to, uint256 value);
    event ApproveTransaction(address indexed owner, uint256 indexed txId);
    event ExecuteTransaction(uint256 indexed txId);

//  storage

    address[3] public owners;         // Exactly 3 owners
    mapping(address => bool) public isOwner;

    struct Transaction {
        address to;
        uint256 value;
        bool executed;
        uint256 approvals;
    }

    Transaction[] public transactions;

    // txId => owner => approved
    mapping(uint256 => mapping(address => bool)) public approved;


    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not owner");
        _;
    }

    modifier txExists(uint256 _txId) {
        require(_txId < transactions.length, "Tx does not exist");
        _;
    }

    modifier notExecuted(uint256 _txId) {
        require(!transactions[_txId].executed, "Already executed");
        _;
    }

    modifier notApproved(uint256 _txId) {
        require(!approved[_txId][msg.sender], "Already approved");
        _;
    }

  

    constructor(address[3] memory _owners) {
        for (uint256 i = 0; i < 3; i++) {
            require(_owners[i] != address(0), "Zero address");
            require(!isOwner[_owners[i]], "Duplicate owner");

            isOwner[_owners[i]] = true;
            owners[i] = _owners[i];
        }
    }

   

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    function deposit() external payable {
        emit Deposit(msg.sender, msg.value);
    }

   

    function submitTransaction(address _to, uint256 _value)
        external
        onlyOwner
    {
        transactions.push(Transaction({
            to: _to,
            value: _value,
            executed: false,
            approvals: 0
        }));

        emit SubmitTransaction(transactions.length - 1, _to, _value);
    }

   

    function approveTransaction(uint256 _txId)
        external
        onlyOwner
        txExists(_txId)
        notExecuted(_txId)
        notApproved(_txId)
    {
        approved[_txId][msg.sender] = true;
        transactions[_txId].approvals += 1;

        emit ApproveTransaction(msg.sender, _txId);
    }

   

    function executeTransaction(uint256 _txId)
        external
        onlyOwner
        txExists(_txId)
        notExecuted(_txId)
    {
        Transaction storage transaction = transactions[_txId];

        require(transaction.approvals == 3, "Need 3 approvals");
        require(address(this).balance >= transaction.value, "Insufficient balance");

        transaction.executed = true;

        (bool success, ) = transaction.to.call{value: transaction.value}("");
        require(success, "Transfer failed");

        emit ExecuteTransaction(_txId);
    }


    function getTransactionCount() external view returns (uint256) {
        return transactions.length;
    }
}