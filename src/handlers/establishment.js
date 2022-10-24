const { v4 } = require("uuid");
const AWS = require("aws-sdk");
const headers = require("../utils/headers");

const getEstablishments = async (event) => {
  try {
    const dynamodb = new AWS.DynamoDB.DocumentClient();

    const result = await dynamodb
      .scan({
        TableName: "PaymentsExampleEstablishments",
      })
      .promise();

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    console.log(error)
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

const getEstablishmentById = async (event) => {
  try {
    const dynamodb = new AWS.DynamoDB.DocumentClient();
    const { account } = event.pathParameters;

    const result = await dynamodb
      .get({
        TableName: "PaymentsExampleEstablishments",
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

const updateEstablishment = async (event) => {
  const dynamodb = new AWS.DynamoDB.DocumentClient();
  const { account } = event.pathParameters;

  try {
    const actualParams = JSON.parse(event.body);
    const expectedParams = ["user", "password", "name", "availableMoney"];

    var establishmentExpect = {};

    Object.keys(actualParams).forEach((key) => {
      if (expectedParams.includes(key)) {
        establishmentExpect[key] = actualParams[key];
      }
    });

    let updateExpresion = "SET ";
    let expressionValues = {}
    let namesValues = {}

    Object.keys(establishmentExpect).forEach(key => {
      updateExpresion += `#${key} = :${key}, `
      expressionValues[`:${key}`] = establishmentExpect[key]
      namesValues[`#${key}`] = key
    }); 

    updateExpresion = updateExpresion.substring(0, updateExpresion.length - 2)

    await dynamodb.update({
      TableName: "PaymentsExampleEstablishments",
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
      body: JSON.stringify(establishmentExpect),
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

const createEstablishment = async (event) => {
  const dynamodb = new AWS.DynamoDB.DocumentClient();

  try {
    const actualParams = JSON.parse(event.body);
    const expectedParams = ["user", "password", "name", "availableMoney"];

    var establishmentExpect = {};

    Object.keys(actualParams).forEach((key) => {
      if (expectedParams.includes(key)) {
        establishmentExpect[key] = actualParams[key];
      }
    });

    const createAt = (new Date()).toISOString();
    const account = v4();

    establishmentExpect = { ...establishmentExpect, createAt, account };

    await dynamodb
      .put({
        TableName: "PaymentsExampleEstablishments",
        Item: establishmentExpect,
      })
      .promise();

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(establishmentExpect),
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

const deleteEstablishment = async (event) => {
  try {
    const dynamodb = new AWS.DynamoDB.DocumentClient();
    const { account } = event.pathParameters;

    const result = await dynamodb
      .delete({
        TableName: "PaymentsExampleEstablishments",
        Key: { account },
      })
      .promise();
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        message: "Establishment deleted successfully",
      }),
    };
  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      headers: {
        ...headers,
        "Content-Type": "text/plain",
      },
      body: "Could not delete establishment.",
    };
  }
}

module.exports = {
  getEstablishments,
  getEstablishmentById,
  createEstablishment,
  updateEstablishment,
  deleteEstablishment
};
