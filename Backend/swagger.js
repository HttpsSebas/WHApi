import swaggerAutogen from "swagger-autogen";

const doc = {
  info: {
    title: "Whapi",
    description: "API documentation for Whapi",
  },
  host: "localhost:3000",
};

const outputFile = "./swagger.json";
const endpointsFiles = ["./routes/index.js"];

swaggerAutogen(outputFile, endpointsFiles, doc);
