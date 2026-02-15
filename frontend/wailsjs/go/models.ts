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
	export class RemoteRepoOptions {
	    enabled: boolean;
	    name: string;
	    private: boolean;
	    description: string;
	
	    static createFrom(source: any = {}) {
	        return new RemoteRepoOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enabled = source["enabled"];
	        this.name = source["name"];
	        this.private = source["private"];
	        this.description = source["description"];
	    }
	}
	export class GenerateRepoRequest {
	    year: number;
	    githubUsername: string;
	    githubEmail: string;
	    repoName: string;
	    contributions: ContributionDay[];
	    remoteRepo?: RemoteRepoOptions;
	
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
	        this.remoteRepo = this.convertValues(source["remoteRepo"], RemoteRepoOptions);
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
	    remoteUrl?: string;
	
	    static createFrom(source: any = {}) {
	        return new GenerateRepoResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.repoPath = source["repoPath"];
	        this.commitCount = source["commitCount"];
	        this.remoteUrl = source["remoteUrl"];
	    }
	}
	export class GithubAuthRequest {
	    token: string;
	    remember: boolean;
	
	    static createFrom(source: any = {}) {
	        return new GithubAuthRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.token = source["token"];
	        this.remember = source["remember"];
	    }
	}
	export class GithubUserProfile {
	    login: string;
	    name: string;
	    email: string;
	    avatarUrl: string;
	
	    static createFrom(source: any = {}) {
	        return new GithubUserProfile(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.login = source["login"];
	        this.name = source["name"];
	        this.email = source["email"];
	        this.avatarUrl = source["avatarUrl"];
	    }
	}
	export class GithubAuthResponse {
	    user?: GithubUserProfile;
	    remembered: boolean;
	
	    static createFrom(source: any = {}) {
	        return new GithubAuthResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.user = this.convertValues(source["user"], GithubUserProfile);
	        this.remembered = source["remembered"];
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
	export class GithubLoginStatus {
	    authenticated: boolean;
	    user?: GithubUserProfile;
	
	    static createFrom(source: any = {}) {
	        return new GithubLoginStatus(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.authenticated = source["authenticated"];
	        this.user = this.convertValues(source["user"], GithubUserProfile);
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
	export class RandomPaintRequest {
	    startDate: string;
	    endDate: string;
	    density: number;
	    minPerDay: number;
	    maxPerDay: number;
	    excludeWeekend: boolean;
	    randomSeed: number;
	
	    static createFrom(source: any = {}) {
	        return new RandomPaintRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.startDate = source["startDate"];
	        this.endDate = source["endDate"];
	        this.density = source["density"];
	        this.minPerDay = source["minPerDay"];
	        this.maxPerDay = source["maxPerDay"];
	        this.excludeWeekend = source["excludeWeekend"];
	        this.randomSeed = source["randomSeed"];
	    }
	}
	export class RandomPaintResponse {
	    contributions: ContributionDay[];
	    totalDays: number;
	    activeDays: number;
	    totalCommits: number;
	
	    static createFrom(source: any = {}) {
	        return new RandomPaintResponse(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.contributions = this.convertValues(source["contributions"], ContributionDay);
	        this.totalDays = source["totalDays"];
	        this.activeDays = source["activeDays"];
	        this.totalCommits = source["totalCommits"];
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

