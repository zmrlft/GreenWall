export namespace main {
	
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

}

