const yo = require('yo-yo')
const csjs = require('csjs-inject')
const remixLib = require('remix-lib')

const styleguide = require('../ui/styles-guide/theme-chooser')
const PluginManager = require('../plugin/pluginManager')
const TabbedMenu = require('../tabs/tabbed-menu')
const CompileTab = require('../tabs/compile-tab')
const SettingsTab = require('../tabs/settings-tab')
const AnalysisTab = require('../tabs/analysis-tab')
const DebuggerTab = require('../tabs/debugger-tab')
const SupportTab = require('../tabs/support-tab')
const PluginTab = require('../tabs/plugin-tab')
// const TestTab = require('../tabs/test-tab')
const RunTab = require('../tabs/run-tab')

const EventManager = remixLib.EventManager
const styles = styleguide.chooser()

module.exports = class RighthandPanel {
  constructor (api = {}, events = {}, opts = {}) {
    const self = this
    self.event = new EventManager()
    self._api = api
    self._api.switchTab = x => { // @TODO: refactor
      if (self._components.tabbedMenu) self._components.tabbedMenu.selectTabByClassName(x)
    }
    self._events = events
    self._events.rhp = self.event // @TODO: refactor
    self._opts = opts
    self._view = {
      element: null,
      tabbedMenu: null,
      tabbedMenuViewport: null,
      dragbar: null
    }
    self._components = {}

    self._components.pluginManager = new PluginManager(self._opts.pluginAPI, self._events)
    const tabEvents = {compiler: self._events.compiler, app: self._events.app, rhp: self.event}
    self._components.tabbedMenu = new TabbedMenu(self._api, tabEvents)
    const compileTab = new CompileTab(self._api, self._events, self._opts)
    const runTab = new RunTab(self._api, self._events, self._opts)
    const settingsTab = new SettingsTab(self._api, self._events, self._opts)
    const analysisTab = new AnalysisTab(self._api, self._events, self._opts)
    const debuggerTab = new DebuggerTab(self._api, self._events, self._opts)
    const supportTab = new SupportTab(self._api, self._events, self._opts)

    const optionViews = self._components.tabbedMenu.renderViewport()
    self._view.dragbar = yo`<div id="dragbar" class=${css.dragbar}></div>`
    const options = self._components.tabbedMenu.render()
    self._view.element = yo`
      <div id="righthand-panel" class=${css.righthandpanel}>
        ${self._view.dragbar}
        <div id="header" class=${css.header}>
          ${options}
          ${optionViews}
        </div>
      </div>`
    self._components.tabbedMenu.addTab('Compile', 'compileView', compileTab.render())
    self._components.tabbedMenu.addTab('Run', 'runView', runTab.render())
    self._components.tabbedMenu.addTab('Settings', 'settingsView', settingsTab.render())
    self._components.tabbedMenu.addTab('Analysis', 'staticanalysisView', analysisTab.render())
    self._components.tabbedMenu.addTab('Debugger', 'debugView', debuggerTab.render())
    self._components.tabbedMenu.addTab('Support', 'supportView', supportTab.render())
    self._components.tabbedMenu.selectTabByTitle('Compile')

    self.event.register('plugin-loadRequest', json => {
      const tab = new PluginTab({}, self._events, json)
      const content = tab.render()
      self._components.tabbedMenu.addTab(json.title, 'plugin', content)
      self._components.pluginManager.register(json, content)
    })
  }
  // showDebugger () {
  //   const self = this
  //   if (!self._components.tabbedMenu) return
  //   self._components.tabbedMenu.selectTab(self._view.el.querySelector('li.debugView'))
  // }
  render () {
    const self = this
    if (self._view.element) return self._view.element
    return self._view.element
  }
  init () {
    // @TODO: init is for resizable drag bar only and should be refactored in the future
    const self = this
    const limit = 60
    self._view.dragbar.addEventListener('mousedown', mousedown)
    const ghostbar = yo`<div class=${css.ghostbar}></div>`
    function mousedown (event) {
      event.preventDefault()
      if (event.which === 1) {
        moveGhostbar(event)
        document.body.appendChild(ghostbar)
        document.addEventListener('mousemove', moveGhostbar)
        document.addEventListener('mouseup', removeGhostbar)
        document.addEventListener('keydown', cancelGhostbar)
      }
    }
    function cancelGhostbar (event) {
      if (event.keyCode === 27) {
        document.body.removeChild(ghostbar)
        document.removeEventListener('mousemove', moveGhostbar)
        document.removeEventListener('mouseup', removeGhostbar)
        document.removeEventListener('keydown', cancelGhostbar)
      }
    }
    function getPosition (event) {
      const lhp = window['filepanel'].offsetWidth
      const max = document.body.offsetWidth - limit
      var newpos = (event.pageX > max) ? max : event.pageX
      newpos = (newpos > (lhp + limit)) ? newpos : lhp + limit
      return newpos
    }
    function moveGhostbar (event) { // @NOTE VERTICAL ghostbar
      ghostbar.style.left = getPosition(event) + 'px'
    }
    function removeGhostbar (event) {
      document.body.removeChild(ghostbar)
      document.removeEventListener('mousemove', moveGhostbar)
      document.removeEventListener('mouseup', removeGhostbar)
      document.removeEventListener('keydown', cancelGhostbar)
      self.event.trigger('resize', [document.body.offsetWidth - getPosition(event)])
    }
  }
}

const css = csjs`
  .righthandpanel      {
    display            : flex;
    flex-direction     : column;
    top                : 0;
    right              : 0;
    bottom             : 0;
    box-sizing         : border-box;
    overflow           : hidden;
    height             : 100%;
  }
  .header              {
    height             : 100%;
  }
  .dragbar             {
    position           : absolute;
    width              : 0.5em;
    top                : 3em;
    bottom             : 0;
    cursor             : col-resize;
    z-index            : 999;
    border-left        : 2px solid ${styles.rightPanel.bar_Dragging};
  }
  .ghostbar           {
    width             : 3px;
    background-color  : ${styles.rightPanel.bar_Ghost};
    opacity           : 0.5;
    position          : absolute;
    cursor            : col-resize;
    z-index           : 9999;
    top               : 0;
    bottom            : 0;
  }
`
