import { Octokit } from "octokit";
import YAML from 'yaml'
import dotenv from "dotenv";
dotenv.config();


// instantiate octokit
const octokit = new Octokit({
  auth: process.env.TOKEN,
});

// authenticate to GitHub
async function auth() {
  const token = await octokit.request("GET /user", {
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  return token;
}

async function getBranches(owner, repoName) {
  const branches = await octokit.request("GET /repos/{owner}/{repo}/branches", {
    owner: owner,
    repo: repoName,
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  return branches;
}

async function _getFileContents(owner, repo, branch, fileName) {
  // get repository content by branch
  const getFileContent = await octokit.request(
    "GET /repos/{owner}/{repo}/contents/.github/workflows/{file_sha}",
    {
      owner: owner,
      repo: repo,
      ref: branch,
      file_sha: fileName,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  return getFileContent;
}

function _addFlag(fileContents){
  // 1. Parse with AST awareness
  const doc = YAML.parseDocument(fileContents);

  // 2. Access the `jobs.ci.with` mapping
  const withNode = doc.getIn(['jobs', 'ci', 'with']);

  // 3. Add new field cleanly
  withNode.set('code-qual', true);

  // 4. Dump with formatting preserved
  let modified = doc.toString();
  // post-process fix: fix 4-space expectation for `on.push`
  modified = modified.replace(/^ {6}- /gm, '    - ');
  const updatedContent = Buffer.from(modified, 'utf8').toString('base64');

  return updatedContent;
}

async function _getBaseBrSha(owner, repo, branch){
  const getBaseBranchSHA = await octokit.request(
    "GET /repos/{owner}/{repo}/branches/{branch}",
    {
      owner,
      repo,
      branch,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  return getBaseBranchSHA.data.commit.sha;
}

async function _createNewBranch(owner, repo, baseSha) {
  return await octokit.request(
    "POST /repos/{owner}/{repo}/git/refs",
    {
      owner,
      repo,
      ref: "refs/heads/addFlag",
      sha: baseSha,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
}

async function updateFile(
  owner,
  repo,
  path,
  branch,
  fileContents,
  fileSHA,
  isProtected,
) {
  try {    
    let response;

    // if protected branch, only target branch for modification needs to be changed here
    if (isProtected == true) {
      // 1. get protected branch sha
      const baseSha = await _getBaseBrSha(owner, repo, branch);

      // 2. create new branch from protected branch: https://docs.github.com/en/rest/git/refs?apiVersion=2022-11-28#create-a-reference
      const newBranch = await _createNewBranch(owner, repo, baseSha);
      const newBrName = newBranch.data.ref.split('/')[2];
      console.log('Validate Coorrect newBrName is captured: ', newBrName)

      // 3.5 get test.yml contents from newBranch & modify
      const newFileContents = await _getFileContents(owner, repo, newBrName, 'test.yml');
      console.log('newFileContents: ', newFileContents)
      const file = Buffer.from(
            newFileContents.data.content,
            "base64",
          ).toString("utf8");
      const updatedContent = _addFlag(file);
      const targetFileSha = newFileContents.data.sha;
      console.log('Validate updatedContent: ', updatedContent)
      
      // 4. push changes to new branch
      const pushedChanges = await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
        owner,
        repo,
        path,
        branch: newBrName,
        message: "add code qual flag to test.yml",
        committer: {
          name: owner,
          email: owner + "@gmail.com",
        },
        content: updatedContent,
        sha: targetFileSha, // need to get sha from new branchs; currently uses base branch file's sha
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      console.log('Validate changes pushed to newBr pushedChanges: ', pushedChanges)

      // 5. create PR
      response = await octokit.request("POST /repos/{owner}/{repo}/pulls", {
        owner,
        repo,
        title: "add code qual flag",
        body: "Please pull these awesome changes in!",
        head: newBrName,
        base: branch,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      // more on potential rate limit issues (eg repos with > 200 branches) https://docs.github.com/en/enterprise-cloud@latest/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2022-11-28#about-secondary-rate-limits
    } else {
      const updatedContent = _addFlag(fileContents);

      response = await octokit.request(
        "PUT /repos/{owner}/{repo}/contents/{path}",
        {
          owner,
          repo,
          path,
          branch: branch,
          message: "add code qual flag to test.yml",
          committer: {
            name: owner,
            email: owner + "@gmail.com",
          },
          content: updatedContent,
          sha: fileSHA,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );
    }

    console.log(`response-${branch}: `, response);
  } catch (error) {
    if (error.response) {
      console.error(
        // `Error! Status: ${error.response.status}. Message: ${error.response.data.message}`,
        `ERROR! ${error}`
      );
    }
    console.error(error);
  }
}

// entry point
async function main() {
  try {
    // auth
    await auth();

    repos.forEach(async (repo) => {
      const branches = await getBranches(owner, repo);

      if (branches.status == 200 && branches.data.length > 0) {
        branches.data.forEach(async (branch) => {
          const isProtected = branch.protected;
          const branchName = branch.name;

          // console.log(`${branchName}`, JSON.stringify(branch.commit))

          const fileContentsResponse = await _getFileContents(
            owner,
            repo,
            branchName,
            "test.yml", // replace file with target file
          );
          const sha = fileContentsResponse.data.sha;
          const file = Buffer.from(
            fileContentsResponse.data.content,
            "base64",
          ).toString("utf8");

          // console.log(`${repo}-${i}-${branchName}-${sha} type: ${typeof file} file: \n${file}\n`)
          updateFile(owner, repo, path, branchName, file, sha, isProtected);
        });
      }
    });
  } catch (error) {
    if (error.response) {
      console.error(
        `Error! Status: ${error.response.status}. Message: ${error.response.data.message}`,
      );
    }
    console.error(error);
  }
}

main();
