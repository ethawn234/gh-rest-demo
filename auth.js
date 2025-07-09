import { Octokit } from "octokit";
import dotenv from 'dotenv';
dotenv.config()

console.log(process.env.TOKEN)
const octokit = new Octokit({
  auth: process.env.TOKEN
})

const res = await octokit.request('GET /user', {
  headers: {
    'X-GitHub-Api-Version': '2022-11-28'
  }
});

console.log(res)