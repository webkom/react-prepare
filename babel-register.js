/* eslint-disable */
// This makes mocha work with babel-compiled typescript.

const register = require('@babel/register').default;

register({ extensions: ['.ts', '.tsx', '.js', '.jsx'] });
