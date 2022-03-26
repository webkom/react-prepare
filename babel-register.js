/* eslint-disable */

// This is a workaround to make mocha work with babel-compiled typescript.
// For some reason it doesn't recognize .ts files when just using '--require @babel/register'

const register = require('@babel/register').default;

register({ extensions: ['.ts', '.tsx', '.js', '.jsx'] });
