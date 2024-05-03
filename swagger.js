const swaggerAutogen = require('swagger-autogen')({openapi: '3.0.0'});

const doc = {
  info: {
    title: 'Gutenberg API',              
    description: 'Express API for a reading list application'
  },
  tags: [      
    {
      name: 'Register', 
      description: 'Route for registering users' 
    },
    {
      name: 'Login', 
      description: 'Routes for logging in users' 
    },             
    {
      name: 'Book', 
      description: 'Routes for interacting with the Book model' 
    },
    {
      name: 'User', 
      description: 'Routes for interacting with the User model' 
    },
    {
      name: 'Reading List', 
      description: 'Routes for interacting with the Reading List model' 
    }
  ]
};

const outputFile = './swagger-output.json';
const routes = ['./index.js'];

/* NOTE: If you are using the express Router, you must pass in the 'routes' only the 
root file where the route starts, such as index.js, app.js, routes.js, etc ... */

swaggerAutogen(outputFile, routes, doc);