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
	    targetPath: string;
	
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
	        this.targetPath = source["targetPath"];
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

