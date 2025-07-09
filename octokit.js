import { Octokit } from "octokit";
import dotenv from 'dotenv';
dotenv.config()

const octokit = new Octokit({
  auth: process.env.TOKEN
})

const res = await octokit.request('GET /user', {
  headers: {
    'X-GitHub-Api-Version': '2022-11-28'
  }
});

console.log(res.status)

const repos = async function getRepos(){
  // takes single arg: list of repos
  // fetch all repos & branches in list
  // return an object where k,v is { repo: branches[] }
}

async function _validateBranchProtection(){
  // takes repo & branch and returns boolean for branch protection status
}

async function updateFile(owner, repo, path){
  // updater function
  // args: repo, branch, path/to/file
  // updates target file if unprotected
  // updates target file and creates PR if branch is protected
  try {
    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: 'OWNER',
      repo: 'REPO',
      path: 'PATH',
      message: 'my commit message',
      committer: {
        name: 'Monalisa Octocat',
        email: 'octocat@github.com'
      },
      content: 'bXkgbmV3IGZpbGUgY29udGVudHM=',
      sha: '95b966ae1c166bd92f8ae7d1c313e738c731dfc3',
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
  } catch (error) {
    if (error.response) {
      console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
    }
    console.error(error)
  }
}

const updateAFile = await updateFile('ethawn234', 'gh-rest-demo', );
console.log(updateAFile)

async function entryPoint(){
  // routing function
  // call getRepos to list all repos that need code quality flag
  // iterates through list of objects keyed by repoName. The value is a list of all branches in the repo
  // call _validateBranchProtection to determine branch protection
  // call updateFile
}