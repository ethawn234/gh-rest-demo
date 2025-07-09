import { Octokit } from "octokit";
import { getChangedFiles } from "./octokit.js";
import dotenv from 'dotenv';
dotenv.config()

export const octokit = new Octokit({
  auth: process.env.TOKEN
})

const res = await octokit.request('GET /user', {
  headers: {
    'X-GitHub-Api-Version': '2022-11-28'
  }
});

console.log(res.status)

const getChangedFilesRes = await getChangedFiles('ethawn234', 'gh-rest-demo');
console.log(getChangedFilesRes)