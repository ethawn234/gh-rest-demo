import { Octokit } from "octokit";
import { getChangedFiles } from "./octokit";

// Create a personal access token at https://github.com/settings/tokens/new?scopes=repo
const octokit = new Octokit({ auth: process.env.ACCESS_TOKEN });

// Compare: https://docs.github.com/en/rest/reference/users#get-the-authenticated-user
const {
  data: { login },
} = await octokit.rest.users.getAuthenticated();
console.log("Hello, %s", login);

const getChangedFiles = getChangedFiles('ethawn234', 'gh-rest-demo');
console.log(getChangedFiles)