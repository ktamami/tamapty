"use strict";

class Workout {
  date = new Date();
  id = this.date.getTime() + "";
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lat, lng]
    this.distance = distance; //km
    this.duration = duration; // minute
  }
  _setDesc() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    this.desc = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDay()}`;
  }

  click() {
    this.clicks++;
  }
}
class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDesc();
  }
  calcPace() {
    this.pace = this.duration / this.distance;
  }
}

class Cyclying extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevation) {
    super(coords, distance, duration, elevation);
    this.elevation = elevation;
    this.calcSpeed();
    this._setDesc();
  }
  calcSpeed() {
    // km/h
    this.speed = this.distance / this.duration / 60;
  }
}

////////////////////////////////////////////////////////////
// Application architecture
const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");

class App {
  #map;
  #zoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    this._getPosition();

    // Get data from local strage
    this._getLocalStorage();

    form.addEventListener("submit", this._newWorkout.bind(this));

    inputType.addEventListener("change", this._toggleElevationField);
    containerWorkouts.addEventListener("click", this._moveToMarker.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("Couldn't get your position.");
        }
      );
    }
  }

  _loadMap(event) {
    const { latitude } = event.coords;
    const { longitude } = event.coords;
    console.log(`https://www.google.co.jp/maps/@${latitude},${longitude}`);
    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#zoomLevel);

    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    console.log(this.#map);

    this.#workouts.forEach((workout) => {
      this._renderList(workout);
      this._renderMarker(workout);
    });

    this.#map.on("click", this._showForm.bind(this));
  }

  _showForm(e) {
    this.#mapEvent = e;
    // フォームを表示させる
    form.classList.remove("hidden");
    // Defaultのカーソル
    inputDistance.focus();
  }
  _hideForm() {
    // Hide the form and clear input fields
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        "";
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"));
  }

  _toggleElevationField() {
    // Switch elevation input with cafence
    inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
    inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
  }
  // Render workout on map as marker
  _renderMarker(workout) {
    L.marker(workout.coords, { opacity: 0.8 })
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type == "running" ? "🏃‍♂️" : "🚴‍♀️"} ${workout.desc}`
      )
      .openPopup();
  }
  // Render workout list
  _renderList(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.desc}</h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === "running" ? "🏃‍♂️" : "🚴‍♀️"
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>`;
    if (workout.type === "running")
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.pace.toFixed(1)}</span>
        <span class="workout__unit">min/km</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">🦶🏼</span>
        <span class="workout__value">${workout.cadence}</span>
        <span class="workout__unit">spm</span>
      </div>
    </li>`;
    if (workout.type === "cycling")
      html += `
      <div class="workout__details">
        <span class="workout__icon">⚡️</span>
        <span class="workout__value">${workout.speed.toFixed(1)}</span>
        <span class="workout__unit">km/h</span>
      </div>
      <div class="workout__details">
        <span class="workout__icon">⛰</span>
        <span class="workout__value">${workout.elevation}</span>
        <span class="workout__unit">m</span>
      </div>
    </li>`;
    form.insertAdjacentHTML("afterend", html);
  }

  _newWorkout(e) {
    e.preventDefault();
    // 今の位置
    const { lat, lng } = this.#mapEvent.latlng;
    // Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    let workout;

    // Check if data is valid
    const validData = (inputs) =>
      inputs.every((input) => Number.isFinite(input));
    const checkPositive = (inputs) => inputs.every((input) => input > 0);

    // If activity running, create running object
    if (type === "running") {
      const cadence = +inputCadence.value;
      if (
        !validData([distance, duration, cadence]) ||
        !checkPositive([distance, duration, cadence])
      )
        return alert("Inputs have to be positive number");
      else {
        workout = new Running([lat, lng], distance, duration, cadence);
        this._renderMarker(workout);
        this._renderList(workout);
        this._hideForm();
      }
    }
    // If activity cycling, create cycling object
    if (type === "cycling") {
      const elevation = +inputElevation.value;
      if (
        !validData([distance, duration, elevation]) ||
        !checkPositive([distance, duration])
      )
        return alert("Inputs have to be positive number");
      else {
        workout = new Cyclying([lat, lng], distance, duration, elevation);
        this._renderMarker(workout);
        this._renderList(workout);
        this._hideForm();
      }
    }

    // Add new object to workout array and store to the local
    this.#workouts.push(workout);
    this._setLocalStorage();
  }
  _moveToMarker(e) {
    const workoutEl = e.target.closest(".workout");
    console.log(workoutEl);
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#zoomLevel, {
      animate: true,
      pan: {
        duratioon: 1,
      },
    });
    // workout.click();
  }
  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }
  _getLocalStorage() {
    const loadedData = JSON.parse(localStorage.getItem("workouts"));
    if (!loadedData) return;
    this.#workouts = loadedData;
  }
  reset() {
    localStorage.removeItem("workouts");
    location.reload();
  }
}

const app = new App();
