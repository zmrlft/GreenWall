export namespace main {
	
	export class CheckGitInstalledResponse {
	    installed: boolean;
	    version: string;
	
	    static createFrom(source: any = {}) {
	        return new CheckGitInstalledResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.installed = source["installed"];
	        this.version = source["version"];
	    }
	}
	export class ContributionDay {
	    date: string;
	    count: number;
	
	    static createFrom(source: any = {}) {
	        return new ContributionDay(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.date = source["date"];
	        this.count = source["count"];
	    }
	}
	export class ExportContributionsRequest {
	    contributions: ContributionDay[];
	
	    static createFrom(source: any = {}) {
	        return new ExportContributionsRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.contributions = this.convertValues(source["contributions"], ContributionDay);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ExportContributionsResponse {
	    filePath: string;
	
	    static createFrom(source: any = {}) {
	        return new ExportContributionsResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.filePath = source["filePath"];
	    }
	}
	export class GenerateRepoRequest {
	    year: number;
	    githubUsername: string;
	    githubEmail: string;
	    repoName: string;
	    contributions: ContributionDay[];
	
	    static createFrom(source: any = {}) {
	        return new GenerateRepoRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.year = source["year"];
	        this.githubUsername = source["githubUsername"];
	        this.githubEmail = source["githubEmail"];
	        this.repoName = source["repoName"];
	        this.contributions = this.convertValues(source["contributions"], ContributionDay);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class GenerateRepoResponse {
	    repoPath: string;
	    commitCount: number;
	
	    static createFrom(source: any = {}) {
	        return new GenerateRepoResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.repoPath = source["repoPath"];
	        this.commitCount = source["commitCount"];
	    }
	}
	export class GitHubConfig {
	    clientId: string;
	    clientSecret: string;
	    redirectUrl: string;
	    scopes: string[];
	
	    static createFrom(source: any = {}) {
	        return new GitHubConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.clientId = source["clientId"];
	        this.clientSecret = source["clientSecret"];
	        this.redirectUrl = source["redirectUrl"];
	        this.scopes = source["scopes"];
	    }
	}
	export class GitHubUser {
	    login: string;
	    id: number;
	    avatar_url: string;
	    name: string;
	    email: string;
	    bio: string;
	
	    static createFrom(source: any = {}) {
	        return new GitHubUser(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.login = source["login"];
	        this.id = source["id"];
	        this.avatar_url = source["avatar_url"];
	        this.name = source["name"];
	        this.email = source["email"];
	        this.bio = source["bio"];
	    }
	}
	export class ImportContributionsResponse {
	    contributions: ContributionDay[];
	
	    static createFrom(source: any = {}) {
	        return new ImportContributionsResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.contributions = this.convertValues(source["contributions"], ContributionDay);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class OAuthCallbackRequest {
	    code: string;
	    state: string;
	    clientId: string;
	    clientSecret: string;
	    redirectUrl: string;
	
	    static createFrom(source: any = {}) {
	        return new OAuthCallbackRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.code = source["code"];
	        this.state = source["state"];
	        this.clientId = source["clientId"];
	        this.clientSecret = source["clientSecret"];
	        this.redirectUrl = source["redirectUrl"];
	    }
	}
	export class OAuthCallbackResponse {
	    accessToken: string;
	    user?: GitHubUser;
	
	    static createFrom(source: any = {}) {
	        return new OAuthCallbackResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.accessToken = source["accessToken"];
	        this.user = this.convertValues(source["user"], GitHubUser);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class OAuthStartRequest {
	    clientId: string;
	    redirectUrl: string;
	    scopes: string[];
	
	    static createFrom(source: any = {}) {
	        return new OAuthStartRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.clientId = source["clientId"];
	        this.redirectUrl = source["redirectUrl"];
	        this.scopes = source["scopes"];
	    }
	}
	export class OAuthStartResponse {
	    authUrl: string;
	    state: string;
	
	    static createFrom(source: any = {}) {
	        return new OAuthStartResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.authUrl = source["authUrl"];
	        this.state = source["state"];
	    }
	}
	export class SetGitPathRequest {
	    gitPath: string;
	
	    static createFrom(source: any = {}) {
	        return new SetGitPathRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.gitPath = source["gitPath"];
	    }
	}
	export class SetGitPathResponse {
	    success: boolean;
	    message: string;
	    version: string;
	
	    static createFrom(source: any = {}) {
	        return new SetGitPathResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.message = source["message"];
	        this.version = source["version"];
	    }
	}

}

