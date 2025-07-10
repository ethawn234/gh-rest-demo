import { Octokit } from "octokit";
import yaml, { JSON_SCHEMA } from 'js-yaml';
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

// curl -L \
//   -H "Accept: application/vnd.github+json" \
//   -H "Authorization: Bearer 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" \
//   -H "X-GitHub-Api-Version: 2022-11-28" \
//   'https://api.github.com/repos/ethawn234/gha-docker/contents/.github/workflows/test.yml'

async function _getFileSha(owner, repo, fileName) {
  const getFileSha = await octokit.request('GET /repos/{owner}/{repo}/contents/.github/workflows/{file_sha}', { // get file sha
    owner: owner,
    repo: repo,
    file_sha: fileName,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  });
  const fileSha = getFileSha.data.sha;

  const response = await octokit.request('GET /repos/{owner}/{repo}/git/blobs/{file_sha}', { // 
    owner: owner,
    repo: repo,
    file_sha: fileSha,
    headers: {
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })
  // console.log('getFileShaRes: ', response)
  return response;
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
    // console.log('data:', JSON.stringify(data, null, 2));
    
    data.jobs.validate_get_last_build_wf.steps.push({ name: 'My Extra Step', run: 'echo Hello' });

    const modified = yaml.dump(data); 
    // console.log('stringed modified: ', JSON.stringify(modified))
    // console.log('modified: ', modified)
    const updatedContent = Buffer.from(modified, 'utf8').toString('base64');

    console.log('updatedContent: ', atob(updatedContent))

    const pushChange = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner: owner,
      repo: repo,
      path: path,
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

    console.log('pushChange: ', pushChange)
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

    repos.forEach(async (repo, i) => {
      const response = await getBranches(owner, repo); // gets all branches
      
      if (response.status == 200 && response.data.length > 0){
        response.data.forEach(async branch => { // loop over all branches in current repo
          const isProtected = branch.protected;
          const branchName = branch.name;
          
          if(isProtected == false){
            // br is unprotected; add flag directly
            const fileContentsResponse = await _getFileSha(owner, repo, 'test.yml'); // replace file with target file
            const fileSHA = fileContentsResponse.data.sha;
            const file = Buffer.from(fileContentsResponse.data.content, 'base64')//.toString('utf8');

            // console.log(`${repo}-${i}-${branchName}-${fileSHA} type: ${typeof file} file: \n${file}\n`)  
            updateFile(owner, repo, path, branchName, file, fileSHA) // current error
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