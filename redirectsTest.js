let redirectFailMsg = (results) => {
    let msg = ""
    const N = "\n"
    if (Array.isArray(results)) {
      for (let result of results) {
        let subMsg = ""
        if (result.location !== result.redirectUrl) {
          subMsg += `source: ${result.source}${
            N}location from header: ${result.location}${
            N}expected: ${result.redirectUrl}`
        }
        if (result.status !== result.expectedStatus) {
          subMsg += (subMsg.length ? "\n" : "") + `${result.status} does not match ${result.expectedStatus}`
        }
        msg += `${subMsg}${
          N}--------------------------------------------${
          N}`
      }
      return msg
    } else {
      return "404 issue."
    }
  },
  { country, env } = cliArgs,
  migrationModules = migrationModule.started,
  excelLocation = `${appDir}/excel/${env.toLowerCase()}/${country.toLowerCase()}-redirects.xlsx`

let urls = excelParser(excelLocation),
  promiseArr = []
if (process.env.GITHUB_TOKEN) {
  urls.forEach(({ url, title, check }, index) => {
    // check whether github token exists and get redirect json
    if (check === "TRUE") {
      let option = { url }
      option.headers = {
          "Authorization": `token ${process.env.GITHUB_TOKEN}`,
          "accept": "application/vnd.github.v3.raw+json"
        }
      /** create promise which gets json for redirect rule from url given
       * then pushes it into an array so that it can be resolved
       */ using Promise all
      let result = new Promise((resolve, reject) => {
        request.get(option, (err, response, body) => {
          if (!err) {
            let { matchRules } = JSON.parse(body)
            resolve(matchRules)
          }
        }).on("error", (err) => {
          reject(err)
        })
      })
      promiseArr.push(result)
    }
  })
} else {
  urls = []
  console.log("No process.env.GITHUB_TOKEN")
}

before(function () {
    this.timeout(360000)
    return Promise.all(promiseArr).then(function (val) {
      // mapping matchRules into urls array
      val.forEach((item, index) => {
        urls[index].matchRules = item
      })
    })
  })
// loop through urls list given from the excel file
for (let url of urls) {
  describe("Redirect test", () => {
    it(`${url.title} ready to check`, function (done) {
      this.timeout(36000)
      let { check, matchRules } = url
      if (check === "TRUE" && matchRules.length > 0) {
        describe(`Check ${url.title}`, () => {
          // test each redirect rule for url given
          matchRules.forEach((rule) => {
            // if there is a redirect and a url base
            if (rule.redirectURL && rule.path && rule.host && rule.statusCode) {
              it(`${rule.host.split(" ")[0]}${rule.path} to ${rule.redirectURL}`,
                function (done) {
                  this.timeout(36000)
                    // check out the checkMultiRedirect method for more
                    // info on result
                  migrationModules.checkMultiRedirect(rule).then(
                    (result) => {
                      done(
                        assert.strictEqual(
                          result,
                          true,
                          `${rule.host.split(" ")[0]}${rule.path} redirect failed \n${redirectFailMsg(result)}`
                        )
                      )
                    }
                  )
                }
              )
            }
          })
        })
      } else if (!matchRules || (matchRules || []).length === 0) {
        console.info(`No matchRules found ${url.title}`)
      }
      // calling done for Check ${title} it block
      done()
    })
  })
}
