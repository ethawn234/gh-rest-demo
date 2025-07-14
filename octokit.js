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
    const data = yaml.load(fileContents);

    data.jobs.ci.with["code-qual"] = true;
    // console.dir(data, { depth: null }) // json is proper json & directly modificable; console.log() abbreviates object vals

    const modified = yaml.dump(data);
    const updatedContent = Buffer.from(modified, "utf8").toString("base64");

    let response;

    // if protected branch, only target branch for modification needs to be changed here
    if (isProtected == true) {
      // create new branch from protected branch
      // push new branch before PR?
      // https://docs.github.com/en/rest/git/refs?apiVersion=2022-11-28#create-a-reference
      const newBranch = await octokit.request(
        "POST /repos/{owner}/{repo}/git/refs",
        {
          owner,
          repo,
          ref: `refs/heads/add-flag`,
          sha: fileSHA,
          headers: {
            "X-GitHub-Api-Version": "2022-11-28",
          },
        },
      );

      // push changes to new branch
      await octokit.request("PUT /repos/{owner}/{repo}/contents/{path}", {
        owner: owner,
        repo: repo,
        path: path,
        branch: newBranch,
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
      });

      // create PR
      response = await octokit.request("POST /repos/{owner}/{repo}/pulls", {
        owner,
        repo,
        title: "add code qual flag",
        body: "Please pull these awesome changes in!",
        head: newBranch,
        base: branch,
        headers: {
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
      // more on potential rate limit issues (eg repos with > 200 branches) https://docs.github.com/en/enterprise-cloud@latest/rest/using-the-rest-api/rate-limits-for-the-rest-api?apiVersion=2022-11-28#about-secondary-rate-limits
    } else {
      response = await octokit.request(
        "PUT /repos/{owner}/{repo}/contents/{path}",
        {
          owner: owner,
          repo: repo,
          path: path,
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

    repos.forEach(async (repo) => {
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
const owner = "ethawn234";
const path = ".github/workflows/test.yml";
// const repos = ['gha-docker', 'gha-custom-actions', 'gha-data']; // test.yml
const repos = ["gha-data"]; // test.yml
