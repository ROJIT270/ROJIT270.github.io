/**
 * script.js - Full client-side implementation with Category Support
 * - Theme (light/dark)
 * - Navigation + hamburger
 * - Projects (load from projects.json with fallback)
 * - Project modal with focus trap
 * - Skills animation & toggle
 * - OffTopic Blog (admin-only creation; visitors can view and like)
 * - Admin auth (client-side, localStorage) for managing blogs
 * - Contact form: integrated with Formspree endpoint (AJAX + non-JS fallback)
 * - CV (download simulation + print + PDF preview)
 * - Scroll & interaction effects (parallax, profile tilt, navbar shrink)
 * - Reveal on scroll + scroll progress
 */

/* ===========================
   Configuration
   =========================== */
const FORMSPREE_ENDPOINT = "https://formspree.io/f/mpqwvbwy"
const ADMIN_PASS_KEY = "portfolio-admin-pass"
const ADMIN_AUTH_KEY = "portfolio-admin-auth"

/* ===========================
   State
   =========================== */
const state = {
  projects: [],
  filteredProjects: [],
  currentFilter: "all",
  currentCategory: "all",
  blogs: [],
  currentBlogId: null,
  theme: "light",
  skillViewMode: "percent",
}

/* ===========================
   Initialization
   =========================== */
document.addEventListener("DOMContentLoaded", () => {
  const yearEl = document.getElementById("year")
  if (yearEl) yearEl.textContent = new Date().getFullYear()

  initTheme()
  initNav()
  initProjects()
  initSkills()
  initBlogs() // renamed from initPosts
  initContact()
  initCV()
  initObservers()
  initScrollEffects()
  initAdmin()
})

/* ===========================
   Admin helpers
   =========================== */
function isAdmin() {
  return localStorage.getItem(ADMIN_AUTH_KEY) === "true"
}

function setAdminAuthenticated(val) {
  if (val) localStorage.setItem(ADMIN_AUTH_KEY, "true")
  else localStorage.removeItem(ADMIN_AUTH_KEY)
  updateAdminUI()
}

/* ===========================
   Admin UI + Flow
   =========================== */
function initAdmin() {
  const adminBtn = document.getElementById("admin-toggle")
  if (!adminBtn) return

  adminBtn.addEventListener("click", () => {
    if (isAdmin()) {
      if (confirm("Log out of admin mode?")) {
        setAdminAuthenticated(false)
        alert("Logged out of admin mode.")
      }
      return
    }

    const storedPass = localStorage.getItem(ADMIN_PASS_KEY)
    if (!storedPass) {
      const p1 = prompt("No admin password set. Create a new admin password:")
      if (!p1) return
      const p2 = prompt("Confirm admin password:")
      if (p1 !== p2) {
        alert("Passwords did not match — try again.")
        return
      }
      localStorage.setItem(ADMIN_PASS_KEY, p1)
      localStorage.setItem(ADMIN_AUTH_KEY, "true")
      alert("Admin password set. You are now logged in as admin.")
      updateAdminUI()
      return
    }

    const attempt = prompt("Enter admin password:")
    if (!attempt) return
    if (attempt === storedPass) {
      setAdminAuthenticated(true)
      alert("Admin login successful.")
    } else {
      alert("Incorrect password.")
    }
  })

  updateAdminUI()
}

function updateAdminUI() {
  const panel = document.getElementById("admin-blog-panel")
  const adminBtn = document.getElementById("admin-toggle")
  if (isAdmin()) {
    if (panel) {
      panel.removeAttribute("aria-hidden")
      panel.style.display = "flex"
    }
    if (adminBtn) adminBtn.textContent = "Admin (Logout)"
  } else {
    if (panel) {
      panel.setAttribute("aria-hidden", "true")
      panel.style.display = "none"
    }
    if (adminBtn) adminBtn.textContent = "Admin"
  }

  renderBlogs()
}

/* ===========================
   Theme Management
   =========================== */
function initTheme() {
  const saved = localStorage.getItem("portfolio-theme")
  const system = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  state.theme = saved || system
  applyTheme(state.theme)

  const btn = document.getElementById("theme-toggle")
  const footerBtn = document.getElementById("footer-theme-toggle")
  if (btn) btn.addEventListener("click", toggleTheme)
  if (footerBtn) footerBtn.addEventListener("click", toggleTheme)

  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      if (!localStorage.getItem("portfolio-theme")) {
        state.theme = e.matches ? "dark" : "light"
        applyTheme(state.theme)
      }
    })
  }
}

function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t)
  const icon = document.querySelector("#theme-toggle i")
  if (icon) icon.className = t === "dark" ? "fas fa-sun" : "fas fa-moon"
  const footerBtn = document.getElementById("footer-theme-toggle")
  if (footerBtn)
    footerBtn.innerHTML = t === "dark" ? '<i class="fas fa-sun"></i> Light' : '<i class="fas fa-moon"></i> Dark'
}

function toggleTheme() {
  state.theme = state.theme === "light" ? "dark" : "light"
  applyTheme(state.theme)
  localStorage.setItem("portfolio-theme", state.theme)
}

/* ===========================
   Navigation
   =========================== */
function initNav() {
  const hamburger = document.querySelector(".hamburger")
  const nav = document.getElementById("nav-menu")
  if (hamburger && nav) {
    hamburger.addEventListener("click", (e) => {
      e.stopPropagation()
      hamburger.classList.toggle("active")
      nav.classList.toggle("active")
      const expanded = hamburger.classList.contains("active")
      hamburger.setAttribute("aria-expanded", expanded)
    })

    document.addEventListener("click", (e) => {
      if (!nav.contains(e.target) && !hamburger.contains(e.target)) {
        hamburger.classList.remove("active")
        nav.classList.remove("active")
        hamburger.setAttribute("aria-expanded", "false")
      }
    })
  }

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault()
      const id = link.getAttribute("href")
      const el = document.querySelector(id)
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
      if (hamburger && nav) {
        hamburger.classList.remove("active")
        nav.classList.remove("active")
        hamburger.setAttribute("aria-expanded", "false")
      }
    })
  })
}

/* ===========================
   Projects
   =========================== */
async function initProjects() {
  try {
    const res = await fetch("projects.json")
    if (!res.ok) throw new Error("no projects.json")
    const data = await res.json()
    state.projects = Array.isArray(data) ? data : []
  } catch (err) {
    console.warn("projects.json not found — using demo", err)
    state.projects = demoProjects()
  }
  state.filteredProjects = state.projects.slice()
  renderCategoryButtons()
  renderProjects()
  renderFilterTags()
  initProjectSearch()
}

function demoProjects() {
  return [
    {
      id: 1,
      title: "When Nepotism Destroys a Company | A Powerful Anti-Corruption Story",
      description: "Nepotism and corruption don’t just hurt individuals, they can collapse entire organizations",
      fullDescription: "This video exposes how favoritism, unchecked power, and corruption led to the shutdown of a company, serving as a warning for leaders and societies alike.",
      category: "youtube",
      tags: ["Informative Video", "Ethics on Technology"],
      image: "resources/Youtube1.png",
      youtube: "https://www.youtube.com/feed/history",
      demo: "https://www.youtube.com/watch?v=ue_Yj6ww-hs",
    },

     {
      id: 1.5,
      title: "Professionalism at workplace",
      description: "This video shows about people being unprofessional at workplace. Video is made for awareness for people to be professional at their workplace and show their professional behavior towards their respective staff members.",
      fullDescription: "Professionalism plays a vital role in creating a respectful and productive workplace. This video highlights examples of unprofessional behavior at work and how such actions can affect employees, teamwork, and the overall environment.Created for awareness, the video encourages individuals to maintain professional conduct and show respect toward their colleagues and staff members, helping build a positive and healthy workplace culture.",
      category: "youtube",
      tags: ["Informative Video", "Professionalism in Workplace"],
      image: "resources/Youtube2.png",
      youtube: "https://www.youtube.com/@Professionalkids-sr6jn",
      demo: "https://www.youtube.com/watch?v=cryQXn94l6g&t=6s",
    },
    
   
     {
    id: 2,
    title: "Nepal Earthquake Analysis & Prediction",
    description: "From Data Exploration to ML Forecasting",
    fullDescription: "This project analyzes a dataset of Nepal earthquakes from 2015-2025, sourced from Kaggle, to uncover patterns in seismic activity and build predictive models. Using Pandas and Dask for efficient data loading and preprocessing, I aggregated and visualized trends like hourly quake counts, magnitude distributions, and depth-magnitude relationships. A Random Forest classifier identifies large earthquakes (magnitude ≥5.0) with high accuracy, while an LSTM neural network forecasts future magnitudes based on time-series sequences. Models were trained, evaluated, and saved for deployment, demonstrating scalable data handling and ML techniques for disaster risk insights. Built in Google Colab with scikit-learn and TensorFlow.",
    category: "github",
    tags: ["Jupyter_Notebook", "Python", "Data Visualization"],
    image: "resources/Github1.png", // <-- your full image path
    github: "https://github.com/ROJIT270/MLPC_IDV_Assignment"
  },

  {
    id: 2.2,
    title: "Student–Teacher Ratio Analysis & Clustering",
    description: "Analysis of Teacher to student ratio in Nepal's district level.",
    fullDescription: "Analyzed student-teacher ratios (STR) across 76 Nepalese districts: cleaned and transformed level-wise STR data, visualized distributions and province averages, and used K-Means clustering (silhouette = 0.534) to group districts by STR profile. Deliverables: cleaned CSV, EDA plots (histogram, boxplots, heatmap, top-district bar chart), and a clustered dataset.",
    category: "github",
    tags: ["Jupytr_Notebook,", "Python,", "Data Visualization"],
    image: "resources/GitHub2.png", // Example: You can add any image here
    github: "https://github.com/ROJIT270/DAML_Indv_Assignment",
  },

  {
    id: 2.3,
    title: "Banking System GUI / Bank Management System",
    description: "A simple demo of typical banking system with basic features. ",
    fullDescription: "A Java desktop application that consist graphical user interface for the purpose of simulating basic banking operations. Supports features like account creation, deposits, withdrawals, balance checks, and transactions built using Swing (or similar) for the GUI as a college project.",
    category: "github",
    tags: ["Java"],
    image: "resources/GitHub5.png", // Example: You can add any image here
    github: "https://github.com/ROJIT270/BankingSystem_Demo",
  },

  {
    id: 2.4,
    title: "Student Registration System",
    description: "A simple application demo for students to keep track and control courses they have enrolled in..",
    fullDescription: "A desktop application based on java for managing student registration andrecords. Features include adding, updating, viewing, and deleting student information with a simple user interface (likely using Swing/JavaFX) and data persistence.",
    category: "github",
    tags: ["Java"],
    image: "resources/GitHub4.png", // Example: You can add any image here
    github: "https://github.com/ROJIT270/Student_Course_Registration_System",
  },

    {
      id: 3,
      title: "N/A",
      description: "N/A",
      fullDescription: "N/A",
      category: "others",
      tags: ["N/A"],
      image:"resources/Others1.png",
    },
  ]
}

function renderCategoryButtons() {
  const container = document.getElementById("category-buttons")
  if (!container) return
  const categories = [
    { id: "all", label: "All Projects", icon: "fa-th" },
    { id: "youtube", label: "YouTube", icon: "fa-youtube" },
    { id: "github", label: "GitHub", icon: "fa-github" },
    { id: "others", label: "Others", icon: "fa-folder" },
  ]
  container.innerHTML = ""
  categories.forEach((cat) => {
    const btn = document.createElement("button")
    btn.className = `category-btn ${state.currentCategory === cat.id ? "active" : ""}`
    // choose icon family - brands for youtube/github, solid for others
    const iconFamily = cat.icon === "fa-youtube" || cat.icon === "fa-github" ? "fab" : "fas"
    btn.innerHTML = `<i class="${iconFamily} ${cat.icon}"></i> ${cat.label}`
    btn.addEventListener("click", () => filterByCategory(cat.id))
    container.appendChild(btn)
  })
}

function filterByCategory(category) {
  state.currentCategory = category
  state.currentFilter = "all"
  if (category === "all") {
    state.filteredProjects = state.projects.slice()
  } else {
    state.filteredProjects = state.projects.filter((p) => p.category === category)
  }
  renderCategoryButtons()
  renderProjects()
  renderFilterTags()
  const searchInput = document.getElementById("search-projects")
  if (searchInput) searchInput.value = ""
}

function renderProjects() {
  const grid = document.getElementById("projects-grid")
  if (!grid) return
  grid.innerHTML = ""
  if (!state.filteredProjects.length) {
    grid.innerHTML = '<p class="muted">No projects found.</p>'
    return
  }
  state.filteredProjects.forEach((p) => {
    const card = document.createElement("article")
    card.className = "project-card"
    card.tabIndex = 0
    card.innerHTML = `
      <img loading="lazy" class="project-thumbnail" src="${p.image || defaultProjectImage(p.title)}" alt="${escapeHtml(p.title)}">
      <div class="project-content">
        <h3 class="project-title">${escapeHtml(p.title)}</h3>
        <p class="project-description">${escapeHtml(p.description)}</p>
        <div class="project-tags">${(p.tags || []).map((t) => `<span class="project-tag">${escapeHtml(t)}</span>`).join("")}</div>
      </div>
    `
    card.addEventListener("click", () => openProjectModal(p))
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        openProjectModal(p)
      }
    })
    grid.appendChild(card)
  })
}

function defaultProjectImage(title) {
  const txt = encodeURIComponent(title || "Project")
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 600 360'%3E%3Crect width='600' height='360' fill='%2306b6d4'/%3E%3Ctext x='50%25' y='50%25' fill='white' font-family='Arial' font-size='32' text-anchor='middle' dominant-baseline='middle'%3E${txt}%3C/text%3E%3C/svg%3E`
}

function renderFilterTags() {
  const container = document.getElementById("filter-tags")
  if (!container) return
  container.innerHTML = ""
  const set = new Set()
  const currentPool = state.currentCategory === "all" ? state.projects : state.projects.filter((p) => p.category === state.currentCategory)
  currentPool.forEach((p) => (p.tags || []).forEach((t) => set.add(t)))
  set.forEach((tag) => {
    const btn = document.createElement("button")
    btn.className = "filter-tag"
    btn.textContent = tag
    btn.type = "button"
    btn.addEventListener("click", () => {
      toggleFilter(tag, btn)
    })
    container.appendChild(btn)
  })
}

function toggleFilter(tag, btn) {
  const buttons = document.querySelectorAll(".filter-tag")
  const basePool = state.currentCategory === "all" ? state.projects : state.projects.filter((p) => p.category === state.currentCategory)
  if (state.currentFilter === tag) {
    state.currentFilter = "all"
    buttons.forEach((b) => b.classList.remove("active"))
    state.filteredProjects = basePool.slice()
  } else {
    state.currentFilter = tag
    buttons.forEach((b) => b.classList.remove("active"))
    btn.classList.add("active")
    state.filteredProjects = basePool.filter((p) => (p.tags || []).includes(tag))
  }
  renderProjects()
}

function initProjectSearch() {
  const input = document.getElementById("search-projects")
  if (!input) return
  input.addEventListener(
    "input",
    debounce((e) => {
      const q = (e.target.value || "").toLowerCase().trim()
      const basePool = state.currentCategory === "all" ? state.projects : state.projects.filter((p) => p.category === state.currentCategory)
      const pool = state.currentFilter === "all" ? basePool : basePool.filter((p) => (p.tags || []).includes(state.currentFilter))
      state.filteredProjects = pool.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q)),
      )
      renderProjects()
    }, 180),
  )
}

/* ===========================
   Project modal (accessible with focus trap)
   =========================== */
let lastFocused = null
function openProjectModal(project) {
  const modal = document.getElementById("project-modal")
  const body = document.getElementById("modal-body")
  if (!modal || !body) return
  lastFocused = document.activeElement

  let links = ""
  if (project.category === "youtube") {
    links = `${project.youtube ? `<a class="btn btn-primary" href="${project.youtube}" target="_blank" rel="noopener noreferrer"><i class="fab fa-youtube"></i> View Channel</a>` : ""}${project.demo ? `<a class="btn btn-ghost" href="${project.demo}" target="_blank" rel="noopener noreferrer"><i class="fas fa-play"></i> Watch Video</a>` : ""}`
  } else if (project.category === "github") {
    links = `${project.github ? `<a class="btn btn-primary" href="${project.github}" target="_blank" rel="noopener noreferrer"><i class="fab fa-github"></i> View Code</a>` : ""}${project.demo ? `<a class="btn btn-ghost" href="${project.demo}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> Live Demo</a>` : ""}`
  } else {
    links = `${project.github ? `<a class="btn btn-primary" href="${project.github}" target="_blank" rel="noopener noreferrer"><i class="fab fa-github"></i> View Code</a>` : ""}${project.demo ? `<a class="btn btn-ghost" href="${project.demo}" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> View Project</a>` : ""}`
  }

  body.innerHTML = `
    <div class="modal-grid">
      <img class="modal-image" src="${project.image || defaultProjectImage(project.title)}" alt="${escapeHtml(project.title)}">
      <div class="modal-content-inner">
        <h2 id="modal-title">${escapeHtml(project.title)}</h2>
        <p>${escapeHtml(project.fullDescription || project.description || "")}</p>
        <div class="project-tags">${(project.tags || []).map((t) => `<span class="project-tag">${escapeHtml(t)}</span>`).join("")}</div>
        <div class="modal-links">${links}</div>
      </div>
    </div>
  `

  modal.setAttribute("aria-hidden", "false")
  modal.style.display = "flex"
  setTimeout(() => modal.setAttribute("open", ""), 20)
  document.body.style.overflow = "hidden"

  const closeBtn = modal.querySelector(".modal-close")
  closeBtn && closeBtn.focus()
  trapFocus(modal)
}

function closeProjectModal() {
  const modal = document.getElementById("project-modal")
  if (!modal) return
  if (modal._removeTrap) modal._removeTrap()
  modal.removeAttribute("open")
  modal.setAttribute("aria-hidden", "true")
  modal.style.display = "none"
  document.body.style.overflow = ""
  if (lastFocused) lastFocused.focus()
}
document.addEventListener("click", (e) => {
  const modal = document.getElementById("project-modal")
  if (!modal) return
  if (e.target === modal) closeProjectModal()
})
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const modal = document.getElementById("project-modal")
    if (modal && modal.getAttribute("aria-hidden") === "false") closeProjectModal()
    const blogModal = document.getElementById("blog-modal")
    if (blogModal && blogModal.getAttribute("aria-hidden") === "false") closeBlogModal()
  }
})
document.addEventListener("DOMContentLoaded", () => {
  const closeBtn = document.querySelector("#project-modal .modal-close")
  if (closeBtn) closeBtn.addEventListener("click", closeProjectModal)
  const blogCloseBtn = document.querySelector("#blog-modal .modal-close")
  if (blogCloseBtn) blogCloseBtn.addEventListener("click", closeBlogModal)
})
function trapFocus(container) {
  const focusable = container.querySelectorAll(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
  )
  if (!focusable.length) return
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  function keyHandler(e) {
    if (e.key !== "Tab") return
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }
  container.addEventListener("keydown", keyHandler)
  container._removeTrap = () => container.removeEventListener("keydown", keyHandler)
}

/* ===========================
   Skills
   =========================== */
function initSkills() {
  document.querySelectorAll(".skill-progress").forEach((bar) => {
    const w = bar.style.width || bar.dataset.targetWidth || "0%"
    bar.dataset.targetWidth = w
    bar.style.width = "0"
  })
  const btn = document.getElementById("toggle-skill-view")
  if (btn) btn.addEventListener("click", toggleSkillView)
}

function toggleSkillView() {
  state.skillViewMode = state.skillViewMode === "percent" ? "level" : "percent"
  document.querySelectorAll(".skill-card").forEach((card) => {
    const valEl = card.querySelector(".skill-value")
    const prog = card.querySelector(".skill-progress")
    if (!valEl || !prog) return
    const percent = prog.dataset.targetWidth || prog.style.width || ""
    const level = prog.dataset.level || prog.getAttribute("data-level") || ""
    valEl.textContent = state.skillViewMode === "level" ? level || percent : percent || level
  })
}

function animateSkillBars() {
  document.querySelectorAll(".skill-progress").forEach((bar, i) => {
    const target = bar.dataset.targetWidth || "0%"
    setTimeout(() => (bar.style.width = target), i * 80)
  })
}

/* ===========================
   OffTopic Blog Section
   =========================== */
function initBlogs() {
  const saved = localStorage.getItem("portfolio-blogs")
  try {
    state.blogs = saved ? JSON.parse(saved) : seedBlogs()
  } catch {
    state.blogs = seedBlogs()
  }
  renderBlogs()
  updateAdminUI()
  const addBtn = document.getElementById("add-blog")
  if (addBtn) addBtn.addEventListener("click", addBlog)
}

function seedBlogs() {
  return [
    {
      id: Date.now() - 3000,
      title: "Why I Love CSS Grid",
      content:
        "Just learned CSS Grid and it's absolutely life-changing! The ability to create complex layouts with just a few lines of code is incredible. I spent years fighting with floats and flexbox for 2D layouts, but Grid makes it so intuitive.\n\nThe grid-template-areas property is particularly amazing - you can literally draw your layout in ASCII art and CSS will make it happen. If you haven't tried it yet, I highly recommend diving in!",
      date: new Date(Date.now() - 86400000 * 3).toISOString(),
      likes: 5,
      liked: false,
    },
    {
      id: Date.now() - 2000,
      title: "The Art of Debugging",
      content:
        "Here's something I wish I learned earlier: sometimes the best debugging technique is to step away from the computer.\n\nI was stuck on a bug for 3 hours yesterday. Went for a walk, came back, and solved it in 5 minutes. Your brain continues processing problems in the background, even when you're not actively thinking about them.\n\nSo next time you're stuck, give yourself permission to take a break. It's not procrastination - it's debugging.",
      date: new Date(Date.now() - 86400000 * 2).toISOString(),
      likes: 12,
      liked: false,
    },
  ]
}

function saveBlogs() {
  localStorage.setItem("portfolio-blogs", JSON.stringify(state.blogs))
}

function renderBlogs() {
  const c = document.getElementById("blogs-container")
  if (!c) return
  c.innerHTML = ""

  if (!state.blogs.length) {
    c.innerHTML = `
      <div class="blogs-empty">
        <i class="fas fa-feather-alt"></i>
        <p>No blog posts yet. Check back soon!</p>
      </div>
    `
    return
  }

  const sorted = [...state.blogs].sort((a, b) => new Date(b.date) - new Date(a.date))
  sorted.forEach((blog) => {
    const card = document.createElement("article")
    card.className = "blog-card"
    card.dataset.blogId = blog.id

    const preview = blog.content.length > 150 ? blog.content.substring(0, 150) + "..." : blog.content
    const formattedDate = new Date(blog.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })

    card.innerHTML = `
      <div class="blog-card-header">
        <div class="blog-card-info">
          <h3 class="blog-card-title">${escapeHtml(blog.title)}</h3>
          <div class="blog-card-meta">
            <span><i class="fas fa-calendar-alt"></i> ${formattedDate}</span>
            <span><i class="fas fa-heart"></i> ${blog.likes || 0} likes</span>
          </div>
        </div>
        <div class="blog-card-actions" onclick="event.stopPropagation()">
          <button aria-label="like" onclick="likeBlog(${blog.id})" class="${blog.liked ? "liked" : ""}">
            <i class="fas fa-heart"></i> ${blog.likes || 0}
          </button>
        </div>
      </div>
      <p class="blog-card-preview">${escapeHtml(preview)}</p>
      <div class="read-more-hint">
        <span>Click to read more</span>
        <i class="fas fa-arrow-right"></i>
      </div>
    `

    card.addEventListener("click", () => openBlogModal(blog.id))
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        openBlogModal(blog.id)
      }
    })
    card.tabIndex = 0
    c.appendChild(card)
  })
}

function addBlog() {
  if (!isAdmin()) {
    alert("Only the site owner (admin) can add blogs.")
    return
  }
  const titleInput = document.getElementById("blog-title")
  const contentInput = document.getElementById("blog-content")
  if (!titleInput || !contentInput) return

  const title = titleInput.value.trim()
  const content = contentInput.value.trim()

  if (!title) {
    alert("Please add a title for your blog.")
    return
  }
  if (!content) {
    alert("Please write some content.")
    return
  }

  const newBlog = {
    id: Date.now(),
    title,
    content,
    date: new Date().toISOString(),
    likes: 0,
    liked: false,
  }
  state.blogs.unshift(newBlog)
  saveBlogs()
  renderBlogs()
  titleInput.value = ""
  contentInput.value = ""
}

function likeBlog(id) {
  const blog = state.blogs.find((x) => x.id === id)
  if (!blog) return
  blog.liked = !blog.liked
  blog.likes = (blog.likes || 0) + (blog.liked ? 1 : -1)
  saveBlogs()
  renderBlogs()

  // Update modal if open
  if (state.currentBlogId === id) {
    const likeBtn = document.querySelector(".blog-modal-like button")
    if (likeBtn) {
      likeBtn.className = blog.liked ? "liked" : ""
      likeBtn.innerHTML = `<i class="fas fa-heart"></i> ${blog.liked ? "Liked" : "Like"} (${blog.likes})`
    }
  }
}

function editBlog(id) {
  if (!isAdmin()) {
    alert("Only admin can edit blogs.")
    return
  }
  const blog = state.blogs.find((x) => x.id === id)
  if (!blog) return

  const newTitle = prompt("Edit blog title:", blog.title)
  if (newTitle === null) return

  const newContent = prompt("Edit blog content:", blog.content)
  if (newContent === null) return

  if (newTitle.trim()) blog.title = newTitle.trim()
  if (newContent.trim()) blog.content = newContent.trim()

  saveBlogs()
  renderBlogs()
  if (state.currentBlogId === id) openBlogModal(id)
}

function deleteBlog(id) {
  if (!isAdmin()) {
    alert("Only admin can delete blogs.")
    return
  }
  if (confirm("Delete this blog post?")) {
    state.blogs = state.blogs.filter((x) => x.id !== id)
    saveBlogs()
    renderBlogs()
    if (state.currentBlogId === id) closeBlogModal()
  }
}

/* ===========================
   Blog Modal
   =========================== */
function openBlogModal(id) {
  const modal = document.getElementById("blog-modal")
  const body = document.getElementById("blog-modal-body")
  if (!modal || !body) return

  const blog = state.blogs.find((x) => x.id === id)
  if (!blog) return

  state.currentBlogId = id
  lastFocused = document.activeElement

  const formattedDate = new Date(blog.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Convert newlines to paragraphs
  const contentHtml = blog.content
    .split("\n\n")
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("")

  const adminControls = isAdmin()
    ? `
    <div class="blog-modal-admin">
      <button data-action="edit" data-blog-id="${blog.id}"><i class="fas fa-edit"></i> Edit</button>
      <button class="delete" data-action="delete" data-blog-id="${blog.id}"><i class="fas fa-trash"></i> Delete</button>
    </div>
  `
    : ""

  body.innerHTML = `
    <div class="blog-modal-header">
      <h2 id="blog-modal-title" class="blog-modal-title">${escapeHtml(blog.title)}</h2>
      <div class="blog-modal-meta">
        <span><i class="fas fa-calendar-alt"></i> ${formattedDate}</span>
        <span><i class="fas fa-heart"></i> ${blog.likes || 0} likes</span>
      </div>
    </div>
    <div class="blog-modal-content">
      ${contentHtml}
    </div>
    <div class="blog-modal-footer">
      <div class="blog-modal-like">
        <button data-action="like" data-blog-id="${blog.id}" class="${blog.liked ? "liked" : ""}">
          <i class="fas fa-heart"></i> ${blog.liked ? "Liked" : "Like"} (${blog.likes || 0})
        </button>
      </div>
      ${adminControls}
    </div>
  `

  body.addEventListener("click", handleBlogModalClick)

  modal.setAttribute("aria-hidden", "false")
  modal.style.display = "flex"
  setTimeout(() => modal.setAttribute("open", ""), 20)
  document.body.style.overflow = "hidden"

  const closeBtn = modal.querySelector(".modal-close")
  closeBtn && closeBtn.focus()
  trapFocus(modal)
}

function handleBlogModalClick(e) {
  const button = e.target.closest("button[data-action]")
  if (!button) return

  const action = button.dataset.action
  const blogId = Number.parseInt(button.dataset.blogId, 10)

  if (action === "like") {
    likeBlog(blogId)
  } else if (action === "edit") {
    editBlog(blogId)
  } else if (action === "delete") {
    deleteBlog(blogId)
  }
}

function closeBlogModal() {
  const modal = document.getElementById("blog-modal")
  if (!modal) return

  const body = document.getElementById("blog-modal-body")
  if (body) {
    body.removeEventListener("click", handleBlogModalClick)
  }

  if (modal._removeTrap) modal._removeTrap()

  state.currentBlogId = null
  modal.removeAttribute("open")
  modal.setAttribute("aria-hidden", "true")
  modal.style.display = "none"
  document.body.style.overflow = ""
  if (lastFocused) lastFocused.focus()
}

// close blog modal when clicking backdrop (matching project modal behavior)
document.addEventListener("click", (e) => {
  const blogModal = document.getElementById("blog-modal")
  if (blogModal && e.target === blogModal) closeBlogModal()
})

/* ===========================
   Contact (Formspree integration)
   =========================== */
function initContact() {
  const form = document.getElementById("contact-form")
  if (!form) return

  form.action = FORMSPREE_ENDPOINT
  form.method = "POST"

  form.addEventListener("submit", async (e) => {
    e.preventDefault()

    const submitBtn = form.querySelector('button[type="submit"]')

    const inputs = form.querySelectorAll("input, textarea")
    let ok = true
    inputs.forEach((input) => {
      if (!validateField(input)) ok = false
    })
    if (!ok) return

    const payload = {
      name: form.name.value || "",
      email: form.email.value || "",
      subject: form.subject.value || "",
      message: form.message.value || "",
    }

    const gotcha = form.querySelector('input[name="_gotcha"]')
    if (gotcha && gotcha.value) return

    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.dataset.origText = submitBtn.textContent
      submitBtn.textContent = "Sending..."
    }

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (res.ok) {
        alert("Message sent — thank you!")
        form.reset()
      } else {
        if (data && data.errors && Array.isArray(data.errors)) {
          alert("Submission error: " + data.errors.map((e) => e.message).join(", "))
        } else {
          alert("Something went wrong. Please try again.")
        }
      }
    } catch (err) {
      console.error("Form submission error:", err)
      alert("Network error. Please check your connection and try again.")
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = submitBtn.dataset.origText || "Send Message"
      }
    }
  })

  const inputs = form.querySelectorAll("input, textarea")
  inputs.forEach((input) => {
    input.addEventListener("blur", () => validateField(input))
    input.addEventListener("input", () => {
      const err = input.parentElement.querySelector(".error-message")
      if (err) err.textContent = ""
    })
  })
}

function validateField(input) {
  const err = input.parentElement.querySelector(".error-message")
  if (!err) return true
  err.textContent = ""

  if (input.hasAttribute("required") && !input.value.trim()) {
    err.textContent = "This field is required."
    return false
  }

  if (input.type === "email" && input.value) {
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(input.value)) {
      err.textContent = "Please enter a valid email."
      return false
    }
  }

  return true
}

/* ===========================
   CV
   =========================== */
function initCV() {
  // path to your PDF (ensure file exists at this relative path)
  const PDF_PATH = "resources/RojitKhadgiResume.pdf"

  const dlBtn = document.getElementById("download-cv")
  const printBtn = document.getElementById("print-cv")
  const footerDlBtn = document.getElementById("footer-download-cv")

  // modal elements for PDF preview (must match IDs in your HTML)
  const pdfModal = document.getElementById("pdf-preview-modal")
  const pdfIframe = document.getElementById("pdf-preview-iframe")
  const pdfClose = document.getElementById("pdf-close-btn")
  const pdfPrint = document.getElementById("pdf-print-btn")
  const pdfDownload = document.getElementById("pdf-download-btn")

  function triggerDownload(path, filename) {
    const a = document.createElement("a")
    a.href = path
    a.setAttribute("download", filename || "")
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  if (dlBtn) {
    dlBtn.addEventListener("click", (e) => {
      e.preventDefault()
      // If you want a JS-driven download, use triggerDownload; fallback alert kept for older behavior if desired
      triggerDownload(PDF_PATH, "RojitKhadgiResume.pdf")
    })
  }

  if (footerDlBtn) {
    footerDlBtn.addEventListener("click", (e) => {
      e.preventDefault()
      triggerDownload(PDF_PATH, "RojitKhadgiResume.pdf")
    })
  }

  if (printBtn) {
    printBtn.addEventListener("click", (e) => {
      e.preventDefault()
      // open PDF preview modal so user can review before printing
      openPdfPreview(PDF_PATH)
    })
  }

  if (pdfClose) pdfClose.addEventListener("click", closePdfPreview)
  if (pdfDownload) pdfDownload.addEventListener("click", () => triggerDownload(PDF_PATH, "RojitKhadgiResume.pdf"))

  if (pdfPrint) {
    pdfPrint.addEventListener("click", () => {
      try {
        // attempt to print the embedded PDF (works for same-origin)
        if (pdfIframe && pdfIframe.contentWindow) {
          pdfIframe.contentWindow.focus()
          pdfIframe.contentWindow.print()
        } else {
          // fallback: open in new tab
          window.open(PDF_PATH, "_blank")
        }
      } catch (err) {
        // cross-origin or blocked — open in new tab
        window.open(PDF_PATH, "_blank")
      }
    })
  }

  // close modal when clicking backdrop
  document.addEventListener("click", (e) => {
    if (!pdfModal) return
    if (e.target === pdfModal) closePdfPreview()
  })

  // also close on escape (keeps parity with other modals)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (pdfModal && pdfModal.getAttribute("aria-hidden") === "false") closePdfPreview()
    }
  })
}

// Opens a PDF preview modal with the given path (uses existing modal in DOM)
function openPdfPreview(path) {
  const modal = document.getElementById("pdf-preview-modal")
  const iframe = document.getElementById("pdf-preview-iframe")
  if (!modal || !iframe) {
    // fallback: open PDF in new tab if modal is missing
    window.open(path, "_blank")
    return
  }

  // set iframe src (optionally add cache bust param if needed)
  iframe.src = path

  modal.setAttribute("aria-hidden", "false")
  modal.style.display = "flex"
  setTimeout(() => modal.setAttribute("open", ""), 20)
  document.body.style.overflow = "hidden"

  // trap focus inside modal (re-uses trapFocus)
  trapFocus(modal)

  // focus print button for accessibility
  const printBtn = document.getElementById("pdf-print-btn")
  if (printBtn) printBtn.focus()
}

function closePdfPreview() {
  const modal = document.getElementById("pdf-preview-modal")
  const iframe = document.getElementById("pdf-preview-iframe")
  if (!modal) return
  if (iframe) {
    // clear src to stop PDF activity / free memory
    iframe.src = ""
  }

  if (modal._removeTrap) modal._removeTrap()

  modal.removeAttribute("open")
  modal.setAttribute("aria-hidden", "true")
  modal.style.display = "none"
  document.body.style.overflow = ""
}

/* ===========================
   Observers & Scroll Effects
   =========================== */
function initObservers() {
  const revealEls = document.querySelectorAll(".reveal")
  const skillsSection = document.getElementById("skills")

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view")
          if (entry.target === skillsSection) animateSkillBars()
        }
      })
    },
    { threshold: 0.15 },
  )

  revealEls.forEach((el) => revealObserver.observe(el))
}

function initScrollEffects() {
  const progress = document.getElementById("scroll-progress")
  const navbar = document.getElementById("navbar")
  const heroImage = document.querySelector("[data-parallax]")
  const profileImg = document.getElementById("profile-img")

  window.addEventListener("scroll", () => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0

    if (progress) progress.style.width = scrollPercent + "%"
    if (navbar) {
      if (scrollTop > 60) navbar.classList.add("scrolled")
      else navbar.classList.remove("scrolled")
    }

    if (heroImage) {
      const parallaxVal = scrollTop * 0.15
      heroImage.style.transform = `translateY(${parallaxVal}px)`
    }
  })

  if (profileImg) {
    profileImg.addEventListener("mouseenter", () => profileImg.classList.add("tilt"))
    profileImg.addEventListener("mouseleave", () => profileImg.classList.remove("tilt"))
  }
}

/* ===========================
   Utilities
   =========================== */
function escapeHtml(str) {
  if (!str) return ""
  const div = document.createElement("div")
  div.textContent = str
  return div.innerHTML
}

function debounce(fn, delay) {
  let timer
  return function (...args) {
    clearTimeout(timer)
    timer = setTimeout(() => fn.apply(this, args), delay)
  }
}
