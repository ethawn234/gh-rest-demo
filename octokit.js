import { Octokit } from "octokit";
import yaml, { DEFAULT_SCHEMA, JSON_SCHEMA } from "js-yaml";
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

function _walkObject(obj){
  const dstructuredObj = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      // If the value is an object, recursively call the function
      if (typeof value === 'object' && value !== null) {
        // console.log(`Processing object at key: ${key}: ${JSON.stringify(value)}`);
        // obj[key] = JSON.parse(JSON.stringify(value));

        dstructuredObj[key] = _walkObject(value);
      } else {
        // console.log(`Value is not an object...${key}: ${value}`);
        dstructuredObj[key] = value
      }
    }
  }
  console.log('dstructuredObj: ', dstructuredObj)
  // return obj;
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
    // const data = yaml.load(fileContents, JSON_SCHEMA);
    const data = yaml.load(fileContents);
    
    data.jobs.ci.with['code-qual'] = true;
    console.dir(data, { depth: null })

    const modified = yaml.dump(data);
    const updatedContent = Buffer.from(modified, "utf8").toString("base64");
    
    // console.log('updatedContent:', updatedContent)

    // if protected branch, only target branch for modification needs to be changed here
    if (isProtected == true) {
      // create PR for protected branches
      // 1. cut new branch from protected branch
      // 2. modify file
      // 3. create PR

      // const createBranch = await octokit.request(
      //   "POST /repos/{owner}/{repo}/git/refs",
      //   {
      //     owner,
      //     repo,
      //     ref: `refs/heads/add-flag`,
      //     sha: fileSHA,
      //     headers: {
      //       "X-GitHub-Api-Version": "2022-11-28",
      //     },
      //   },
      // );
    }

    // unprotected files updated in all branches; make this request idempotent -> this currently appends; may be necessary if this script is reused for branches that already have required logic
    // const pushChange = await octokit.request(
    //   "PUT /repos/{owner}/{repo}/contents/{path}",
    //   {
    //     owner: owner,
    //     repo: repo,
    //     path: path,
    //     branch: branch,
    //     message: "add line to test.yml",
    //     committer: {
    //       name: owner,
    //       email: owner + "@gmail.com",
    //     },
    //     content: updatedContent,
    //     sha: fileSHA,
    //     headers: {
    //       "X-GitHub-Api-Version": "2022-11-28",
    //     },
    //   },
    // );

    // console.log(`pushChange-${branch}: `, pushChange);
  } catch (error) {
    if (error.response) {
      console.error(
        `Error! Status: ${error.response.status}. Message: ${error.response.data.message}`,
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

    repos.forEach(async repo => {
      const branches = await getBranches(owner, repo);

      if (branches.status == 200 && branches.data.length > 0) {
        branches.data.forEach(async (branch) => {
          const isProtected = branch.protected;
          const branchName = branch.name;

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
          updateFile(
            owner,
            repo,
            path,
            branchName,
            file,
            sha,
            isProtected,
          );
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
const owner = "ethawn234";
const path = ".github/workflows/test.yml";
// const repos = ['gha-docker', 'gha-custom-actions', 'gha-data']; // test.yml
const repos = ["gha-data"]; // test.yml
