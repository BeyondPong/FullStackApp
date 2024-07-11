import Main from "../view/Main.js";
import Play from "../view/Play.js";
import Login from "../view/Login.js";
import Profile from "../view/Profile.js";
import NotFound from "../view/NotFound.js";
import NotLogin from "../view/NotLogin.js";
import Fa from "../view/2FA.js";
import pathToRegex from "../utility/pathToRegex.js";
import getParams from "../utility/getParams.js";
import navigateTo from "../utility/navigateTo.js";
import updateBackground from "../utility/updateBackground.js";
import WebSocketManager from "../state/WebSocketManager.js";
import { getLoginURI } from "../api/getAPI.js";
import { postLoginCode } from "../api/postAPI.js";
import { removeBlurBackground } from "../utility/blurBackGround.js";
import { checkLogin } from "../utility/checkLogin.js";
import { check2FAStatus } from "../utility/check2FA.js";
import { checkMultipleLogin } from "../utility/checkMultipleLogin.js";
export class Router {
  constructor() {
    this.routes = [
      { path: "/", view: Main },
      { path: "/login", view: Login },
      { path: "/logout", view: Main },
      { path: "/login_code/", view: Main },
      { path: "/2fa", view: Fa },
      { path: "/play", view: Play },
      { path: "/profile", view: Profile },
      { path: "/notlogin", view: NotLogin },
      { path: "/notfound", view: NotFound },
    ];
  }

  async route() {
    WebSocketManager.closeGameSocket();
    let match = this.findMatch();
    console.log(match);
    if (!match || location.pathname === "/notfound") {
      match = this.handleNotFound();
    }
    await this.handleRouteChange(match);
  }

  findMatch() {
    return this.routes
      .map((route) => ({
        route,
        result: location.pathname.match(pathToRegex(route.path)),
      }))
      .find((potentialMatch) => potentialMatch.result !== null);
  }

  async handleRouteChange(match) {
    switch (match.route.path) {
      case "/login":
        await this.handleLoginRoute();
        break;
      case "/login_code/":
        await this.handleAutorhizationCode();
        break;
      case "/2fa":
        await this.handle2FA(match);
        break;
      case "/logout":
        await this.handleLogoutRoute(match);
        break;
      case "/profile":
        await this.handleProfileRoute(match);
        break;
      case "/play":
        await this.handlePlayRoute(match);
        break;
      case "/":
        await this.handleMainRoute(match);
        break;
      default:
        updateBackground("error");
        await this.render(match);
        break;
    }
  }

  handleNotFound() {
    navigateTo("/notfound");
    updateBackground("error");
    return {
      route: this.routes.find((r) => r.path === "/notfound"),
      result: [location.pathname],
    };
  }

  handleNotLogin() {
    navigateTo("/notlogin");
    updateBackground("error");
    return {
      route: this.routes.find((r) => r.path === "/notlogin"),
      result: [location.pathname],
    };
  }

  async handle2FA(match) {
    if (check2FAStatus() === true) {
      window.location.href = "/";
      return;
    }
    if (checkLogin() === false) {
      window.location.href = "/notlogin";
      return;
    }
    if (checkMultipleLogin() === true) {
      localStorage.clear();
      alert("You are already logged in another device");
      window.location.href = "/";
      return;
    }
    updateBackground("normal");
    removeBlurBackground();
    await this.render(match);
    const viewInstance = new match.route.view(getParams(match));
    viewInstance.addEvent();
  }

  async handleLogoutRoute(match) {
    WebSocketManager.closeFriendSocket();
    localStorage.removeItem("token");
    localStorage.removeItem("2FA");
    window.location.href = "/";
    this.handleMainRoute(match);
  }

  async handleAutorhizationCode() {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    const code = params.get("code");
    const data = await postLoginCode(code);
    localStorage.setItem("token", data.token);
    window.location.href = "/";
  }

  async handleMainRoute(match) {
    if (checkLogin() === true) {
      if (checkMultipleLogin() === true) {
        localStorage.clear();
        alert("You are already logged in another device");
        window.location.href = "/";
        return;
      }
      if (check2FAStatus() === false) {
        window.location.href = "/2fa";
        return;
      }
      const token = localStorage.getItem("2FA");
      WebSocketManager.connectFriendSocket(
        `${window.DAPHNE_URL}/member/login_room/?token=${token}`
      );
    } else {
      WebSocketManager.closeFriendSocket();
    }
    const viewInstance = new match.route.view(getParams(match));
    await this.render(match);
    await viewInstance.onMounted();
    updateBackground("normal");
    removeBlurBackground();
  }

  async handleLoginRoute() {
    if (localStorage.getItem("token") !== null) {
      window.location.href = "/";
    } else if (!localStorage.getItem("token")) {
      const loginURL = await getLoginURI();
      window.location.href = loginURL.redirect_url;
    }
  }

  async handleProfileRoute(match) {
    if (checkLogin() === false) {
      match = this.handleNotLogin();
      await this.render(match);
    } else {
      if (check2FAStatus() === false) {
        window.location.href = "/2fa";
        return;
      }
      await this.render(match);
      const viewInstance = new match.route.view(getParams(match));
      const navItems = Array.from(
        document.getElementsByClassName("profile_nav_item")
      );
      viewInstance.defaultTabs();
      viewInstance.addEvent();
      navItems.forEach((item, index) => {
        item.addEventListener("click", (e) => {
          e.preventDefault();
          navItems.forEach((nav) =>
            nav.querySelector("a").classList.remove("active_tab")
          );
          if (e.target.closest("a") !== null) {
            e.target.closest("a").classList.add("active_tab");
            const tabText = e.target.closest("a").textContent.trim();
            viewInstance.moveTabs(tabText);
          }
        });
      });
      updateBackground("normal");
      removeBlurBackground();
    }
  }

  async handlePlayRoute(match) {
    if (checkLogin() === true) {
      if (check2FAStatus() === false) {
        window.location.href = "/2fa";
        return;
      }
    }
    await this.render(match);
    const viewInstance = new match.route.view(getParams(match));
    const localLink = document.getElementById("local_link");
    const remoteLink = document.getElementById("remote_link");
    const tournamentLink = document.getElementById("tournament_link");
    localLink.addEventListener("click", () => {
      viewInstance.localModal();
    });
    localLink.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        viewInstance.localModal();
      }
    });
    remoteLink.addEventListener("click", () => {
      viewInstance.remoteModal();
    });
    remoteLink.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        viewInstance.remoteModal();
      }
    });
    tournamentLink.addEventListener("click", () => {
      viewInstance.tournamentModal();
    });
    tournamentLink.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        viewInstance.tournamentModal();
      }
    });
    updateBackground("normal");
  }

  async render(match) {
    const viewInstance = new match.route.view(getParams(match));
    document.querySelector("#app").innerHTML = await viewInstance.getHtml();
  }
}
