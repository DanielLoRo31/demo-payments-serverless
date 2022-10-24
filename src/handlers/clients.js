const { v4 } = require("uuid");
const AWS = require("aws-sdk");
const headers = require("../utils/headers");

const getClients = async (event) => {
  try {
    const dynamodb = new AWS.DynamoDB.DocumentClient();

    const result = await dynamodb
      .scan({
        TableName: "PaymentsExampleClients",
      })
      .promise();

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      headers: {
        ...headers,
        "Content-Type": "text/plain",
      },
      body: "Could not fetch any student.",
    };
  }
};

const getClientById = async (event) => {
  try {
    const dynamodb = new AWS.DynamoDB.DocumentClient();
    const { account } = event.pathParameters;

    const result = await dynamodb
      .get({
        TableName: "PaymentsExampleClients",
        Key: {
          account,
        },
      })
      .promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: headers,
        body: "Student not found.",
      };
    }

    const student = result.Item;
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(student),
    };
  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      headers: {
        ...headers,
        "Content-Type": "text/plain",
      },
      body: "Could not fetch any student.",
    };
  }
};

const updateClient = async (event) => {
  const dynamodb = new AWS.DynamoDB.DocumentClient();
  const { account } = event.pathParameters;
  try {
    const actualParams = JSON.parse(event.body);
    const expectedParams = ["user", "password"];
    var clientExpect = {};

    Object.keys(actualParams).forEach((key) => {
      if (expectedParams.includes(key)) {
        clientExpect[key] = actualParams[key];
      }
    });

    let updateExpresion = "SET ";
    let expressionValues = {}
    let namesValues = {}
    Object.keys(clientExpect).forEach(key => {
      updateExpresion += `#${key} = :${key}, `
      expressionValues[`:${key}`] = clientExpect[key]
      namesValues[`#${key}`] = key
    }); 

    updateExpresion = updateExpresion.substring(0, updateExpresion.length - 2)
    await dynamodb.update({
      TableName: "PaymentsExampleClients",
      Key: {
        account,
      },
      UpdateExpression: updateExpresion,
      ExpressionAttributeNames: namesValues,
      ExpressionAttributeValues: expressionValues,
    }).promise();

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(clientExpect),
    };
  } catch (error) {
    console.log(error)
    return {
      statusCode: error.statusCode || 500,
      headers: { ...headers, "Content-Type": "text/plain" },
      body: "Could not create new student.",
    };
  }
};

const createClient = async (event) => {
  const dynamodb = new AWS.DynamoDB.DocumentClient();
  try {
    const actualParams = JSON.parse(event.body);
    const expectedParams = ["user", "password"];

    var clientExpect = {};
    Object.keys(actualParams).forEach((key) => {
      if (expectedParams.includes(key)) {
        clientExpect[key] = actualParams[key];
      }
    });

    const createAt = (new Date()).toISOString();
    const account = v4();
    const payments = [];
    const availableMoney = 0;
    clientExpect = { ...clientExpect, createAt, payments, account, availableMoney };

    await dynamodb.put({
        TableName: "PaymentsExampleClients",
        Item: clientExpect,
      }).promise();

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(clientExpect),
    };
  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      headers: {
        ...headers, "Content-Type": "text/plain",
      },
      body: "Could not create new student.",
    };
  }
};

const deleteClient = async (event) => {
  try {
    const dynamodb = new AWS.DynamoDB.DocumentClient();
    const { account } = event.pathParameters;

    const result = await dynamodb
      .delete({
        TableName: "PaymentsExampleClients",
        Key: { account },
      })
      .promise();
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        message: "Client deleted successfully",
      }),
    };
  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      headers: {
        ...headers,
        "Content-Type": "text/plain",
      },
      body: "Could not delete client.",
    };
  }
}

const depositMoneyToClient = async (event) => {
  const dynamodb = new AWS.DynamoDB.DocumentClient();
  const { account } = event.pathParameters;

  try {
    const actualParams = JSON.parse(event.body);
    const expectedParams = ["money"];

    var clientExpect = {};

    Object.keys(actualParams).forEach((key) => {
      if (expectedParams.includes(key)) {
        clientExpect[key] = actualParams[key];
      }
    });

    const result = await dynamodb
      .get({
        TableName: "PaymentsExampleClients",
        Key: {
          account,
        },
      })
      .promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: headers,
        body: "Client not found.",
      };
    }

    let totalMoney = result.Item.availableMoney
    totalMoney += clientExpect["money"];

    await dynamodb.update({
      TableName: "PaymentsExampleClients",
      Key: {
        account,
      },
      UpdateExpression: "SET #availableMoney = :availableMoney",
      ExpressionAttributeNames: {"#availableMoney": "availableMoney"},
      ExpressionAttributeValues: {":availableMoney": totalMoney},
    }).promise();

    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Content-Type": "text/plain",
      },
      body: `Total money in your account is $${totalMoney}.`,
    };
  } catch (error) {
    console.log(error)
    return {
      statusCode: error.statusCode || 500,
      headers: {
        ...headers,
        "Content-Type": "text/plain",
      },
      body: "Could not create new student.",
    };
  }
};

module.exports = {
  getClients,
  getClientById,
  createClient,
  updateClient,
  depositMoneyToClient,
  deleteClient
};
