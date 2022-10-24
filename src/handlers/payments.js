const { v4 } = require("uuid");
const AWS = require("aws-sdk");
const headers = require("../utils/headers");

const getPaymentsByClientId = async (event) => {
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
        body: "Client not found.",
      };
    }

    const payment = result.Item.payments;
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(payment),
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

const createClientPayment = async (event) => {
  const dynamodb = new AWS.DynamoDB.DocumentClient();
  const { account } = event.pathParameters;

  try {
    const actualParams = JSON.parse(event.body);
    const expectedParams = ["establishmentAccount", "paymentDetail"];

    var paymentExpect = {};

    Object.keys(actualParams).forEach((key) => {
      if (expectedParams.includes(key)) {
        paymentExpect[key] = actualParams[key];
      }
    });

    const createAt = new Date().toISOString();
    const id = v4();

    paymentExpect = { ...paymentExpect, createAt, id };

    paymentExpect["total"] = 0;

    paymentExpect["paymentDetail"].forEach((detail) => {
      paymentExpect["total"] += detail.total;
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

    const resultEstablishment = await dynamodb
      .get({
        TableName: "PaymentsExampleEstablishments",
        Key: {
          account: paymentExpect["establishmentAccount"],
        },
      })
      .promise();

    if (!resultEstablishment.Item) {
      return {
        statusCode: 404,
        headers: headers,
        body: "Establishment not found.",
      };
    }

    let payments = result.Item.payments;
    let availableMoney = result.Item.availableMoney;

    if (availableMoney < paymentExpect["total"]) {
      return {
        statusCode: 500,
        headers: headers,
        body: "Insufficient Funds.",
      };
    }

    payments.push(paymentExpect);

    availableMoney -= paymentExpect["total"];

    await dynamodb
      .update({
        TableName: "PaymentsExampleClients",
        Key: {
          account,
        },
        UpdateExpression:
          "SET #payments = :payments, #availableMoney = :availableMoney",
        ExpressionAttributeNames: {
          "#payments": "payments",
          "#availableMoney": "availableMoney",
        },
        ExpressionAttributeValues: {
          ":payments": payments,
          ":availableMoney": availableMoney,
        },
      })
      .promise();

    await dynamodb
      .update({
        TableName: "PaymentsExampleEstablishments",
        Key: {
          account: paymentExpect["establishmentAccount"],
        },
        UpdateExpression: "SET #availableMoney = :availableMoney",
        ExpressionAttributeNames: { "#availableMoney": "availableMoney" },
        ExpressionAttributeValues: {
          ":availableMoney":
            resultEstablishment.Item.availableMoney + paymentExpect["total"],
        },
      })
      .promise();

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(paymentExpect),
    };
  } catch (error) {
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

const getPaymentsByEstablishmentId = async (event) => {
  const { account } = event.pathParameters;

  try {
    const dynamodb = new AWS.DynamoDB.DocumentClient();

    const resultEstablishment = await dynamodb
      .get({
        TableName: "PaymentsExampleEstablishments",
        Key: {
          account,
        },
      })
      .promise();

    if (!resultEstablishment.Item) {
      return {
        statusCode: 404,
        headers: headers,
        body: "Establishment not found.",
      };
    }

    const result = await dynamodb
      .scan({
        TableName: "PaymentsExampleClients",
      })
      .promise();

    console.log(result)

    const payments = [];

    result.Items.forEach((client) => {
      client.payments.forEach((payment) => {
        if (payment.establishmentAccount == account) {
          payments.push({id: payment.id, total: payment.total, createAt: payment.createAt, clientAccount: client.account})
        }
      });
    });

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify(payments),
    };
  } catch (error) {
    console.log(error);
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

const deletePayment = async (event) => {
  const { id } = event.pathParameters;
  try {
    const dynamodb = new AWS.DynamoDB.DocumentClient();

    const result = await dynamodb
      .scan({
        TableName: "PaymentsExampleClients",
      })
      .promise();

      let clientAccount = '';
      let payments = [];

      result.Items.forEach(client => {
        let index = client.payments.findIndex((payment) => payment.id == id)

        if (index != -1) {
          clientAccount = client.account
          payments = client.payments
          let actualPayment = payments.splice(index, 1)
          return
        }

      });

      if (clientAccount.length == 0) {
        return {
          statusCode: 404,
          headers: headers,
          body: "Payment not found.",
        };
      }

      await dynamodb
      .update({
        TableName: "PaymentsExampleClients",
        Key: {
          account: clientAccount,
        },
        UpdateExpression:
          "SET #payments = :payments",
        ExpressionAttributeNames: {
          "#payments": "payments",
        },
        ExpressionAttributeValues: {
          ":payments": payments,
        },
      })
      .promise();

    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        message: "Payment deleted successfully",
      }),
    };
  } catch (error) {
    return {
      statusCode: error.statusCode || 500,
      headers: {
        ...headers,
        "Content-Type": "text/plain",
      },
      body: "Could not delete payment.",
    };
  }

}

module.exports = {
  getPaymentsByClientId,
  createClientPayment,
  getPaymentsByEstablishmentId,
  deletePayment
};
