#!/usr/bin/env node
"use strict";

var _axios = _interopRequireDefault(require("axios"));

var _colors = _interopRequireDefault(require("colors"));

var _prompts = require("./prompts");

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const getTeamId = async token => {
  try {
    const {
      data: {
        teams = []
      }
    } = await _axios.default.get('https://api.vercel.com/v1/teams', {
      headers: {
        Authorization: token
      }
    });
    return await (0, _prompts.promptForTeam)([{
      name: 'Personal project (NO TEAM)',
      id: false
    }, ...teams]);
  } catch (err) {
    console.log(_colors.default.red('Cannot download teams list. Please check your authorization token !'));
    process.exit(0);
  }
};

const getUidFromName = async env => {
  try {
    const {
      data: {
        deployments = []
      }
    } = await _axios.default.get((0, _utils.appendTeamId)(`https://api.vercel.com/v6/now/deployments`, env.TEAM_ID), {
      headers: {
        Authorization: env.AUTHORIZATION_TOKEN
      }
    });

    if (!deployments.length > 0) {
      console.log(_colors.default.red('No deployments found for your choices. Exiting...'));
      process.exit();
    }

    const projectName = await (0, _prompts.promptForProjectName)([...new Set(deployments.map(project => project.name))]);
    console.log(`Getting list of deployments for ${projectName}`);
    return await (0, _prompts.promptForProjectUrl)(deployments.filter(deployment => deployment.name === projectName));
  } catch (err) {
    console.log(err);
  }
};

(async () => {
  let env = {
    DEPLOYMENT_URL: '',
    AUTHORIZATION_TOKEN: '',
    OUTPUT_DIRECTORY: './deployment_source',
    TEAM_ID: false
  };
  env.AUTHORIZATION_TOKEN = (0, _utils.getAuthToken)((await (0, _prompts.promptForAuthorizationToken)()));
  console.log(_colors.default.yellow('Getting list of teams...'));
  env.TEAM_ID = await getTeamId(env.AUTHORIZATION_TOKEN);
  console.log(_colors.default.yellow('Getting list of deployments...This might take a while...'));
  env.DEPLOYMENT_URL = `https://api.vercel.com/v5/now/deployments/${await getUidFromName(env)}/files`;
  env.OUTPUT_DIRECTORY = (await (0, _prompts.promptForOutputDirectory)()) || env.OUTPUT_DIRECTORY;
  console.log(_colors.default.yellow('Starting the process of recreating the structure...'));
  const getDeploymentStructureURL = (0, _utils.appendTeamId)(env.DEPLOYMENT_URL, env.TEAM_ID);

  try {
    const {
      data
    } = await _axios.default.get(getDeploymentStructureURL, {
      headers: {
        Authorization: env.AUTHORIZATION_TOKEN
      }
    });
    (0, _utils.parseStructure)(data, env.OUTPUT_DIRECTORY, env);
  } catch (err) {
    console.log(err);
  }
})();