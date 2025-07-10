import { Octokit } from "octokit";
import dotenv from 'dotenv';
dotenv.config()

const octokit = new Octokit({
  auth: process.env.TOKEN
})

async function auth() {
  
  const token = await octokit.request('GET /user', {
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  return token;
}

async function getBranches(owner, repoName){
  const branches = await octokit.request('GET /repos/{owner}/{repo}/branches', {
    owner: owner,
    repo: repoName,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  return branches;
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

async function main(){
  try {
    // auth
    const authStatus = await auth();
    if (authStatus.status != 200){
      throw new Error(`Auth failure for ${authStatus.data.login}. Status returned: ${authStatus.status}`)
    } else {
      console.log(`Authentication success for ${authStatus.data.login}. Status: ${authStatus.status}`)
    }

    // call getBranches to list all branches for current repo
    repos.forEach(async (repo, i) => {
      const response = await getBranches(owner, repo);
      if (response.status == 200 && response.data.length > 0){
        response.data.forEach(branch => {
          const isProtected = branch.protected;
          
          if(isProtected == false){
            // br is unprotected; add flag directly
            // review the docs; need to find the correct args; need to verify update is to target file in correct repo & branch
            updateFile(owner, repoName, )
          } else {
            // update file and create PR
          }
        })
      }
      i == 0 && console.log('branches: ', branches)
    })
  } catch (error) {
    if (error.response) {
      console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
    }
    console.error(error)
  }  
}

main()
const owner = 'ethawn234';
const repos = ['gha-docker', 'gha-custom-actions', 'gha-data'];