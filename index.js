"use strict"

const fs = require("fs"),
  path = require("path"),
  assert = require("chai").assert,
  async = require("asyncawait/async"),
  awaitIn = require("asyncawait/await"),
  isHttp2 = require("is-http2"),
  fileUtility = require(`./file/`).started
/**
 * A class to build utilities
 */
class UtilBuilder {
  /**
   * @param {object} browser - global instance from webdriverIO
   * @param {string} dir - the base path of the project
   * @param {object} fileUtility - our file tools
   * @param {string} remote - the base path of the project using this
   * @description set the location of files and pass in the browser instance
   * @return {object} this - an instance of UtilBuilder
   */
  constructor (browser, dir, fileUtility, remote) {
    if (arguments.length !== 4) {
      throw new Error("There are missing parameters.")
    }
    this.browser = browser
    this.fileOperations = fileUtility
    this.utilDirectory = `${dir}/utilities`
    this.remoteDirectory = `${remote}/utilities`
    this.utilFiles = []
    this.utilities = {}
    return this
  }
  /**
   * @description We check our directory and build our util object
   * @return {mixed} output - our utilities object or the error
   */
  buildUtilityObject () {
    if (this.fileOperations.isDirectory(this.utilDirectory)) {
      this.utilFiles = this.fileOperations.getAllFiles(
        this.utilDirectory,
        "-utility.js"
      )
    }
    if (this.fileOperations.isDirectory(this.remoteDirectory)) {
      this.utilFiles = this.utilFiles.concat(
        this.fileOperations.getAllFiles(
          this.remoteDirectory,
          "-utility.js"
        )
      )
    }
    return this.buildUtilities()
  }
  /**
   * @description Here we build all utilities and name them
   * @return {object} - return all utilities
   */
  buildUtilities () {
    this.utilFiles.map(
      (utility) => {
        let temp = this.requireUtility(utility),
          fileName = utility.replace(/^.*[\\\/]/, ""),
          utilityName = fileName.split("-").map(
            (fs, index) => {
              if (index > 0) {
                fs = `${fs.charAt(0).toUpperCase()}${fs.substring(1)}`
              }
              return fs
            }
          ).join("").replace(".js", "")
        this.utilities[utilityName] = temp.started
        return temp
      }
    )
    return this.utilities
  }
  /**
   * @param {string} utility - the path to a utility file
   * @description Here we build our utilities depending on need
   * @return {object} temp - the default object for all utilities
   */
  requireUtility (utility) {
    let temp = require(utility)
    if (typeof temp === "function") {
      temp = require(utility)(this.browser)
    }
    return temp || {}
  }
}

module.exports = (browser, root, remoteFolder, subRemote) => {
  let cliArgs = require("yargs").argv || {}
  if (!cliArgs.country) {
    cliArgs.country = "uk"
  }
  if (!cliArgs.type) {
    cliArgs.type = "regression"
  }
  if (!cliArgs.env) {
    cliArgs.env = "qa"
  }
  let remoteUtils = subRemote === "undefined" ? remoteFolder : subRemote,
    utils = new UtilBuilder(
      browser, root, fileUtility, remoteUtils
    ).buildUtilityObject(),
    tools = {
      fs,
      path,
      assert,
      async,
      awaitIn,
      isHttp2,
      cliArgs
    },
    csvData = require(
      `${root}/utilities/data/csv-tool`
    )(root, remoteUtils),
    jsonData = require(
      `${root}/utilities/data/json-tool`
    )(root, remoteUtils)
  Object.assign(global, {csvData})
  Object.assign(global, {jsonData})
  Object.assign(global, utils)
  Object.assign(global, tools)
  return {
    started: utils,
    className: UtilBuilder
  }
}
