const URL_JOB_PLANET = 'https://www.jobplanet.co.kr';
const URL_KREDIT_JOB = 'https://kreditjob.com';

chrome.runtime.onMessage.addListener(function(request, sender) {
    if (request.action === 'getSource') {
        const pageSource = request.source;

        chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs) {
            try {
                const url = tabs[0].url;
                const [tabDomain] = /([a-z0-9]+\.)*[a-z0-9]+\.[a-z]+/.exec(url);

                const companyName = getCompanyName(tabDomain, pageSource);

                const kreditJobId = await getKreditJobId(companyName);
                createButtonForKreditJob(kreditJobId);
                
                const jobPlanetId = await getJobPlanetId(companyName);

                if (jobPlanetId) {
                    createButtonForJobPlanet(`/companies/${jobPlanetId}/reviews`);
                    getInterview(jobPlanetId);
                    getStatus(jobPlanetId);
                } else {
                    document.getElementById('message').style.display = 'block';
                }
            } catch (e) {
                document.getElementById('message').style.display = 'block';
                createButtonForJobPlanet();
                createButtonForKreditJob();
            } finally {
                document.getElementById('wrap').style.display = 'block';
                document.getElementById('nav').style.display = 'block';
                document.getElementById('spinner').style.display = 'none';
            }
        });
    }
});

function getCompanyName(domain, pageSource) {
    let regex;
    switch (domain) {
    case 'www.saramin.co.kr':
        regex = /<a href="\/zf_user\/company-info\/view\?[^"]*"[^>]*>(.*?)<\/a>/s.exec(pageSource);
        break;
    case 'www.jobkorea.co.kr':
        regex = /<span[^>]*class="coName"[^>]*>(.*?)<\/span>/s.exec(pageSource);
        break;
    }

    if (!regex) throw new Error(`Can't find company name on this page`);

    return regex[1].trim();
}

function getJobPlanetId(companyName) {
    return new Promise(function (resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${URL_JOB_PLANET}/autocomplete/autocomplete/suggest.json?term=${encodeURIComponent(companyName)}`, true);
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                const response = JSON.parse(xhr.response);
                if (response.companies.length > 0) {
                    resolve(response.companies[0].id);
                } else {
                    reject(new Error('something bad happened'));
                }
            } else {
                reject(new Error('something bad happened2'));
            }
        };
        xhr.onerror = function () {
            reject(new Error('something bad happened'));
        };
        xhr.send();
    });
}

function getKreditJobId(companyName) {
    return new Promise(function (resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', `${URL_KREDIT_JOB}/api/search/autocomplete?q=${encodeURIComponent(companyName)}&index=0&size=5`, true);
        xhr.onload = function () {
            if (this.status >= 200 && this.status < 300) {
                const response = JSON.parse(xhr.response);
                if (response.docs.length > 0) {
                    resolve(`/company/${response.docs[0].PK_NM_HASH}`);
                } else {
                    resolve('');
                }
            } else {
                resolve('');
            }
        };
        xhr.onerror = function () {
            resolve('');
        };
        xhr.send();
    });
}

function createButtonAction(id, url) {  
    document.getElementById(id).addEventListener('click', function() {
        chrome.tabs.create({
            url
        });
    });
}
function createButtonForJobPlanet(url = '') {
    createButtonAction('goto-job', `${URL_JOB_PLANET}${url}`);
}
function createButtonForKreditJob(url = '') {
    createButtonAction('goto-kredit', `${URL_KREDIT_JOB}${url}`);
}

function getInterview(jobPlanetId) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${URL_JOB_PLANET}/companies/${jobPlanetId}/landing`, true);
    xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
            const [interviewSrc] = /<article[^>]*id="[^"]*viewInterviewsList"[^>]*>.*?<\/article>/s.exec(xhr.response);
            document.getElementById('interview').innerHTML += interviewSrc;

            const [reviewSrc] = /<article[^>]*id="[^"]*viewReviewsList"[^>]*>.*?<\/article>/s.exec(xhr.response);
            document.getElementById('review').innerHTML += reviewSrc;

            const [infoSrc] = /<section[^>]*class="[^"]*sec_company_info_type">.*?<\/section>/s.exec(xhr.response);
            document.getElementById('info').innerHTML += infoSrc;
        }
    };
    xhr.send();
}

function getStatus(jobPlanetId) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', `${URL_JOB_PLANET}/companies/${jobPlanetId}/reviews`, true);
    xhr.onload = function () {
        if (this.status >= 200 && this.status < 300) {
            const [statusSrc] = /<div[^>]*class="[^"]*review_stats-container">.*?<\/script>/s.exec(xhr.response);
            document.getElementById('status').innerHTML += statusSrc;
                            
            const [statusScript] = /;\(function\(\$\)\{.*?\}\)\(jQuery\);/s.exec(statusSrc);
            eval(statusScript);
        }
    };
    xhr.send();
}

function onWindowLoad() {
    const header = document.getElementById('nav');
    const sticky = header.offsetTop;
    window.onscroll = function() {
        if (window.pageYOffset > sticky) {
            header.classList.add('sticky');
        } else {
            header.classList.remove('sticky');
        }
    };
    
    chrome.tabs.executeScript(null, {
        file: 'document.js'
    }, function() {
        if (chrome.runtime.lastError) {
            document.getElementById('wrap').style.display = 'block';
            document.getElementById('nav').style.display = 'block';
            document.getElementById('spinner').style.display = 'none';
            document.querySelector('#message').innerText = 'This app can\'t run on this page.';
        }
    });
}
window.onload = onWindowLoad;