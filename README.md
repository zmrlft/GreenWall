# README (English)

> 中文: [README (中文)](README_zh.md)

## How to use

Make sure git is installed on your computer.

![app screenshot](/docs/images/app.png)

Download the application, open it, and let your creativity flow! Generating a repository may take a while. After generation, copy the repository folder and enter it to continue.

## Next steps

1. Log in to your GitHub account and create an empty remote repository (do not select README, .gitignore or License).
2. From the generated repository directory run the following commands to push your local repo to the remote:

```bash
git remote add origin <remote-repo-url>
git branch -M main
git push -u origin main
```

Note: After pushing, GitHub may take anywhere from 5 minutes to two days to show the contribution on your profile. You can make the repository private and enable contributions from private repositories in your GitHub contribution settings so others can't see the repo contents but your contribution activity will still be counted.

![private setting screenshot](docs/images/privatesetting.png)

## Future features

We may add support for creating repositories in custom languages. For example, if you want a Java repository, the tool would generate one and it would be reflected in your GitHub language statistics.

## Disclaimer

This project is provided for educational, demonstration, and research purposes related to GitHub contribution mechanics. Misuse (for example to falsify job applications) is the user's responsibility.
