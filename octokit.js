import { Octokit } from "octokit";
import yaml, { JSON_SCHEMA } from 'js-yaml';
import dotenv from 'dotenv';
dotenv.config()

// instantiate octokit
const octokit = new Octokit({
  auth: process.env.TOKEN
})

// authenticate to GitHub
async function auth() {
  
  const token = await octokit.request('GET /user', {
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  return token;
}


// refactor to get single branch
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

async function _getFileContents(owner, repo, branch, fileName) {
  // get repository content by branch
  const getFileContent = await octokit.request('GET /repos/{owner}/{repo}/contents/.github/workflows/{file_sha}', {
    owner: owner,
    repo: repo,
    ref: branch,
    file_sha: fileName,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  return getFileContent;
}

// Path parameters
// Name, Type, Description
// owner string Required The account owner of the repository. The name is not case sensitive.
// repo string Required The name of the repository without the .git extension. The name is not case sensitive.
// path string Required path to file

// Body parameters
// Name, Type, Description
// message string Required The commit message.
// content string Required The new file content, using Base64 encoding.
async function updateFile(owner, repo, path, branch, fileContents, fileSHA){
  try {
    const data = yaml.load(fileContents, JSON_SCHEMA);
    data.jobs.validate_get_last_build_wf.steps.push({ name: 'My Extra Step', run: 'echo Hello' });
    const modified = yaml.dump(data);
    const updatedContent = Buffer.from(modified, 'utf8').toString('base64');

    // unprotected files updated in all branches; make this request idempotent -> this currently appends
    const pushChange = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: owner,
      repo: repo,
      path: path,
      branch: branch,
      message: 'add line to test.yml',
      committer: {
        name: owner,
        email: owner + '@gmail.com'
      },
      content: updatedContent,
      sha: fileSHA,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    // console.log('pushChange: ', pushChange)
  } catch (error) {
    if (error.response) {
      console.error(`Error! Status: ${error.response.status}. Message: ${error.response.data.message}`)
    }
    console.error(error)
  }
}

// entry point
async function main(){
  try {
    // auth
    const authStatus = await auth();
    if (authStatus.status != 200){
      throw new Error(`Auth failure for ${authStatus.data.login}. Status returned: ${authStatus.status}`)
    } else {
      console.log(`Authentication success for ${authStatus.data.login}. Status: ${authStatus.status}`)
    }

    // Steps
    // from repoNames[], fetch each repo
    // for each repo, fetch all branches

    // for all protected branches, update yml & create PR
    // for all unprotected branches, update yml & push
      // target file is identified via its sha
        // currently, 1st modification succeeds and all subsequent reqs fail with 409: non-matching sha - WHY?!!

    repos.forEach(async (repo, i) => {
      const branches = await getBranches(owner, repo); // gets all branches; response.data[{br},..]
      // [{
      //   name: 'abcd',
      //   commit: [Object],
      //   protected: false,
      //   protection: [Object],
      //   protection_url: 'https://api.github.com/repos/ethawn234/gha-docker/branches/abcd/protection'
      // },]
      
      if (branches.status == 200 && branches.data.length > 0){
        branches.data.forEach(async branch => {
          const isProtected = branch.protected;
          const branchName = branch.name;
          
          if(isProtected == false){
            // br is unprotected; add flag directly
            const fileContentsResponse = await _getFileContents(owner, repo, branchName, 'test.yml'); // replace file with target file
            const fileSHA = fileContentsResponse.data.sha;
            const file = Buffer.from(fileContentsResponse.data.content, 'base64').toString('utf8');

            // console.log(`${repo}-${i}-${branchName}-${fileSHA} type: ${typeof file} file: \n${file}\n`)
            updateFile(owner, repo, path, branchName, file, fileSHA) 
          } else {
            // update file and create PR
            console.log('protected br')
          }
        })
      }
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
const path = '.github/workflows/test.yml';
// const repos = ['gha-docker', 'gha-custom-actions', 'gha-data']; // test.yml
const repos = ['gha-data']; // test.yml