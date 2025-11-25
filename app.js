const STORAGE_KEYS = {
  moods: "clarity_moods",
  habits: "clarity_habits",
  goals: "clarity_goals",
  assessments: "clarity_assessments",
};

const LIKERT_OPTIONS = ["Rarely", "Sometimes", "Often", "Always"];

const QUIZZES = {
  stress: {
    title: "Stress Level Assessment",
    questions: [
      "I feel overwhelmed by my responsibilities.",
      "I find it difficult to relax.",
      "I experience headaches or tension frequently.",
      "I feel irritable or on edge.",
      "My sleep feels disrupted.",
    ],
  },
  burnout: {
    title: "Burnout Score",
    questions: [
      "I feel emotionally drained from my work or duties.",
      "I feel detached from what I used to enjoy.",
      "Small tasks feel exhausting.",
      "I have trouble focusing on a single task.",
      "I question the value of my work.",
    ],
  },
  anxiety: {
    title: "Anxiety & Worry Tally",
    questions: [
      "I worry about things I cannot control.",
      "My mind races with 'what if' scenarios.",
      "I experience restlessness.",
      "I avoid situations that might make me anxious.",
      "I notice physical signs like rapid heartbeat.",
    ],
  },
};

const defaultHabits = [
  { name: "Meditate for 10 minutes" },
  { name: "Read 30 pages" },
  { name: "Drink 8 glasses of water" },
];

const defaultGoals = [
  { name: "Learn a new language", targetDate: "2024-12-31", progress: 50 },
  { name: "Save $500", targetDate: "2025-03-01", progress: 30 },
];

class StorageManager {
  static get(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      console.error("Unable to read from storage", error);
      return fallback;
    }
  }

  static set(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Unable to write to storage", error);
    }
  }
}

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const formatDate = (dateString) =>
  new Date(dateString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

class MoodManager {
  constructor() {
    this.buttons = Array.from(document.querySelectorAll(".mood-option"));
    this.noteInput = document.querySelector("#mood-note");
    this.dateInput = document.querySelector("#mood-date");
    this.saveButton = document.querySelector("#save-mood");
    this.historyList = document.querySelector("#mood-history");
    this.selectedMood = null;
    this.entries = StorageManager.get(STORAGE_KEYS.moods, []);

    if (this.dateInput) {
      this.dateInput.value = new Date().toISOString().split("T")[0];
    }

    this.buttons.forEach((btn) =>
      btn.addEventListener("click", () => this.selectMood(btn))
    );

    if (this.saveButton) {
      this.saveButton.addEventListener("click", () => this.saveMood());
    }

    this.renderHistory();
  }

  selectMood(button) {
    this.buttons.forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");
    this.selectedMood = {
      label: button.dataset.mood,
      icon: button.dataset.icon,
    };
  }

  saveMood() {
    if (!this.selectedMood) {
      alert("Please choose a mood before saving.");
      return;
    }

    const date = this.dateInput.value || new Date().toISOString().split("T")[0];
    const note = this.noteInput.value.trim();

    const entry = {
      id: uid(),
      date,
      ...this.selectedMood,
      note,
    };

    this.entries = [entry, ...this.entries];
    StorageManager.set(STORAGE_KEYS.moods, this.entries);
    this.noteInput.value = "";
    this.renderHistory();
  }

  renderHistory() {
    if (!this.historyList) return;
    if (!this.entries.length) {
      this.historyList.innerHTML =
        '<li class="history-item">No entries yet. Log your first mood!</li>';
      return;
    }

    this.historyList.innerHTML = this.entries
      .slice(0, 7)
      .map(
        (entry) => `
        <li class="history-item">
          <span>${entry.icon} ${entry.label}</span>
          <span>${formatDate(entry.date)}</span>
        </li>
      `
      )
      .join("");
  }
}

class AssessmentManager {
  constructor() {
    this.buttonsWrapper = document.querySelector("#assessment-buttons");
    this.modal = document.querySelector("#assessment-modal");
    this.modalTitle = document.querySelector("#modal-title");
    this.form = document.querySelector("#assessment-form");
    this.closeButton = document.querySelector(".modal__close");
    this.historyList = document.querySelector("#assessment-history");
    this.currentQuiz = null;
    this.history = StorageManager.get(STORAGE_KEYS.assessments, []);

    this.bindEvents();
    this.renderHistory();
  }

  bindEvents() {
    if (this.buttonsWrapper) {
      this.buttonsWrapper.addEventListener("click", (event) => {
        if (event.target.matches("button[data-quiz]")) {
          const quizId = event.target.dataset.quiz;
          this.openQuiz(quizId);
        }
      });
    }

    if (this.closeButton) {
      this.closeButton.addEventListener("click", () => this.closeModal());
    }

    if (this.modal) {
      this.modal.addEventListener("click", (event) => {
        if (event.target === this.modal) {
          this.closeModal();
        }
      });
    }
  }

  openQuiz(id) {
    const quiz = QUIZZES[id];
    if (!quiz) return;
    this.currentQuiz = id;
    this.modalTitle.textContent = quiz.title;
    this.form.innerHTML = quiz.questions
      .map(
        (question, index) => `
        <div class="question-block">
          <label for="q-${index}">${question}</label>
          <select id="q-${index}" name="q-${index}" required>
            ${LIKERT_OPTIONS.map(
              (option) => `<option value="${option}">${option}</option>`
            ).join("")}
          </select>
        </div>
      `
      )
      .join("");

    this.form.insertAdjacentHTML(
      "beforeend",
      '<button type="submit" class="secondary">Save Result</button>'
    );

    this.form.onsubmit = (event) => {
      event.preventDefault();
      this.saveAssessment();
    };

    this.modal.classList.remove("hidden");
    this.modal.setAttribute("aria-hidden", "false");
  }

  closeModal() {
    this.modal?.classList.add("hidden");
    this.modal?.setAttribute("aria-hidden", "true");
    this.currentQuiz = null;
  }

  saveAssessment() {
    if (!this.currentQuiz) return;
    const quiz = QUIZZES[this.currentQuiz];
    const values = quiz.questions.map((_, index) => {
      const select = this.form.querySelector(`#q-${index}`);
      return LIKERT_OPTIONS.indexOf(select.value) + 1;
    });

    const rawScore = values.reduce((sum, val) => sum + val, 0);
    const average = rawScore / values.length;
    const feedback = this.interpretScore(average);

    const entry = {
      id: uid(),
      quizId: this.currentQuiz,
      quizTitle: quiz.title,
      score: Math.round(average * 25),
      feedback,
      date: new Date().toISOString(),
    };

    this.history = [entry, ...this.history];
    StorageManager.set(STORAGE_KEYS.assessments, this.history);
    this.renderHistory();
    this.closeModal();
  }

  interpretScore(value) {
    if (value <= 1.5) {
      return "Low - Keep nurturing your routines.";
    }
    if (value <= 2.5) {
      return "Moderate - Consider quick breaks and breathing exercises.";
    }
    if (value <= 3.5) {
      return "Elevated - Plan intentional rest soon.";
    }
    return "High - Reach out for support and prioritize recovery.";
  }

  renderHistory() {
    if (!this.historyList) return;
    if (!this.history.length) {
      this.historyList.innerHTML =
        '<li class="history-item">No assessments yet. Start with Stress or Burnout.</li>';
      return;
    }

    this.historyList.innerHTML = this.history
      .slice(0, 6)
      .map(
        (item) => `
        <li class="history-item">
          <span>${item.quizTitle}</span>
          <span>${item.score}% · ${formatDate(item.date)}</span>
        </li>
      `
      )
      .join("");
  }
}

class HabitManager {
  constructor() {
    const stored = StorageManager.get(STORAGE_KEYS.habits, null);
    this.habits = stored ?? this.seedDefaults();
    this.list = document.querySelector("#habit-list");
    this.form = document.querySelector("#habit-form");
    this.input = document.querySelector("#habit-input");

    this.bindEvents();
    this.render();
  }

  seedDefaults() {
    const seeded = defaultHabits.map((habit) => ({
      id: uid(),
      name: habit.name,
      streak: 0,
      lastCompleted: null,
    }));
    StorageManager.set(STORAGE_KEYS.habits, seeded);
    return seeded;
  }

  bindEvents() {
    this.form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = this.input.value.trim();
      if (!name) return;
      this.habits.push({
        id: uid(),
        name,
        streak: 0,
        lastCompleted: null,
      });
      this.input.value = "";
      this.persist();
      this.render();
    });

    this.list?.addEventListener("click", (event) => {
      const target = event.target;
      if (target.matches("button[data-complete]")) {
        this.completeHabit(target.dataset.complete);
      }
    });
  }

  completeHabit(id) {
    const habit = this.habits.find((item) => item.id === id);
    if (!habit) return;
    const today = new Date().toISOString().split("T")[0];
    if (habit.lastCompleted === today) {
      alert("Already logged for today.");
      return;
    }
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    habit.streak = habit.lastCompleted === yesterday ? habit.streak + 1 : 1;
    habit.lastCompleted = today;
    this.persist();
    this.render();
  }

  persist() {
    StorageManager.set(STORAGE_KEYS.habits, this.habits);
  }

  render() {
    if (!this.list) return;
    if (!this.habits.length) {
      this.list.innerHTML =
        '<li class="history-item">No habits yet. Add your first routine.</li>';
      return;
    }

    this.list.innerHTML = this.habits
      .map(
        (habit) => `
        <li>
          <div class="habit-meta">
            <strong>${habit.name}</strong>
            <span>${habit.streak}-day streak</span>
          </div>
          <button class="check" data-complete="${habit.id}">Complete Today</button>
        </li>
      `
      )
      .join("");
  }
}

class GoalManager {
  constructor() {
    const stored = StorageManager.get(STORAGE_KEYS.goals, null);
    this.goals = stored ?? this.seedDefaults();
    this.form = document.querySelector("#goal-form");
    this.nameInput = document.querySelector("#goal-input");
    this.dateInput = document.querySelector("#goal-date");
    this.list = document.querySelector("#goal-list");

    this.bindEvents();
    this.render();
  }

  seedDefaults() {
    const seeded = defaultGoals.map((goal) => ({
      id: uid(),
      name: goal.name,
      targetDate: goal.targetDate,
      progress: goal.progress,
    }));
    StorageManager.set(STORAGE_KEYS.goals, seeded);
    return seeded;
  }

  bindEvents() {
    this.form?.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = this.nameInput.value.trim();
      const targetDate = this.dateInput.value;
      if (!name || !targetDate) return;
      this.goals.push({
        id: uid(),
        name,
        targetDate,
        progress: 0,
      });
      this.nameInput.value = "";
      this.dateInput.value = "";
      this.persist();
      this.render();
    });

    this.list?.addEventListener("input", (event) => {
      const target = event.target;
      if (target.matches("input[data-goal-range]")) {
        const goal = this.goals.find((item) => item.id === target.dataset.goalRange);
        if (!goal) return;
        goal.progress = Number(target.value);
        this.persist();
        this.render();
      }
    });
  }

  persist() {
    StorageManager.set(STORAGE_KEYS.goals, this.goals);
  }

  render() {
    if (!this.list) return;
    if (!this.goals.length) {
      this.list.innerHTML =
        '<p class="history-item">No goals yet. Define your next milestone.</p>';
      return;
    }

    this.list.innerHTML = this.goals
      .map(
        (goal) => `
        <div class="goal">
          <div class="goal__info">
            <p>${goal.name}</p>
            <span>Target date: ${formatDate(goal.targetDate)}</span>
          </div>
          <div class="progress-bar">
            <span style="width: ${goal.progress}%"></span>
          </div>
          <div class="goal-controls">
            <label for="goal-${goal.id}">${goal.progress}% complete</label>
            <input
              id="goal-${goal.id}"
              class="goal-range"
              type="range"
              min="0"
              max="100"
              value="${goal.progress}"
              data-goal-range="${goal.id}"
            />
          </div>
        </div>
      `
      )
      .join("");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new MoodManager();
  new AssessmentManager();
  new HabitManager();
  new GoalManager();
});

