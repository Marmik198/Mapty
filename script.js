'use strict';

//// VARIABLES
const form = document.querySelector('.form');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const containerWorkouts = document.querySelector('.workouts');
const deleteAllBtn = document.querySelector('#delete--all');
const sortBtn = document.querySelector('#sort--all');

const modal = document.querySelector('.modalForm');
const overlay = document.querySelector('.overlay');
const btnCloseModal = document.querySelector('.btn--close-modal');

const formEdit = document.querySelector('.modal__form');
const inputTypeEdit = document.querySelector('.modal__form .form__input--type');
const inputDistanceEdit = document.querySelector(
  '.modal__form .form__input--distance'
);
const inputDurationEdit = document.querySelector(
  '.modal__form .form__input--duration'
);
const inputCadenceEdit = document.querySelector(
  '.modal__form .form__input--cadence'
);
const inputElevationEdit = document.querySelector(
  '.modal__form .form__input--elevation'
);
const labelCadenceEdit = document.querySelector('.modal-cadence');
const labelElevationEdit = document.querySelector('.modal-elevation');

///////////////////////////////////////////////
//// WORKOUT CLASSES
class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(distance, duration, coords) {
    this.distance = distance;
    this.duration = duration;
    this.coords = coords;
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(distance, duration, coords, cadence) {
    super(distance, duration, coords);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(distance, duration, coords, elevationGain) {
    super(distance, duration, coords);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

///////////////////////////////////////////////
//// APPLICATION CLASS
class App {
  #map;
  #mapEvent;
  #workouts = [];

  #sort = false;

  constructor() {
    /// Get geolocation position
    this.#getPosition();

    /// Get Data form Local Storage
    this.#getLocalStorage();

    /// Form Submit Handler
    form.addEventListener('submit', this.#newWorkout.bind(this));
    /// Form Type Change Handler
    inputType.addEventListener('change', this.#toggleElevationField);
    /// Workout List Operations
    containerWorkouts.addEventListener('click', this.#workoutMenu.bind(this));

    /// DeleteAll button handler
    deleteAllBtn.addEventListener('click', this.#deleteAllWorkout.bind(this));
    /// Sort button handler
    sortBtn.addEventListener('click', this.#sortWorkout.bind(this));
  }

  #getPosition() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        this.#loadMap.bind(this),
        function () {
          const alert = `
            <div class="warning">
              <span><i class="fas fa-exclamation-circle px-4"></i> Could not find your position !!</span>
              <button class="btn--close">&times</button>
            </div>
          `;
          document.body.insertAdjacentHTML('beforebegin', alert);
          /// Alert Close handler
          const closeAlert = document.querySelector('.btn--close');
          closeAlert.addEventListener('click', function () {
            document.querySelector('.warning').remove();
          });
        }
      );
    }
  }

  #loadMap(position) {
    const { latitude, longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude},15z`);

    /// Load Leaflet Map
    const coords = [latitude, longitude];
    this.#map = L.map('map').setView(coords, 17);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    /// Load Markers from Local Storage
    this.#workouts.forEach(workout => this.#renderWorkoutMarker(workout));

    // Set Map again at user position
    this.#map.setView(coords, 17);

    /// Map click Event
    this.#map.on('click', this.#showForm.bind(this));
  }

  #showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  #toggleElevationField() {
    if (inputType.value === 'running') {
      inputElevation.closest('.form__row').classList.add('form__row--hidden');
      inputCadence.closest('.form__row').classList.remove('form__row--hidden');
    }

    if (inputType.value === 'cycling') {
      inputElevation
        .closest('.form__row')
        .classList.remove('form__row--hidden');
      inputCadence.closest('.form__row').classList.add('form__row--hidden');
    }
  }

  #newWorkout(e) {
    e.preventDefault();

    /// Functions
    const whetherAllNumbers = (...nums) =>
      nums.every(num => Number.isFinite(num));
    const whetherAllPositive = (...nums) => nums.every(num => num > 0);

    /// Get data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    /// Alert on invalid input
    const alert = `
            <div class="warning">
              <span><i class="fas fa-exclamation-circle px-4"></i> Inputs have to be positive numbers !!</span>
              <button class="btn--close">&times</button>
            </div>
          `;

    /// If workout activity running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      /// Check if inputs are valid
      if (
        !whetherAllNumbers(distance, duration, cadence) ||
        !whetherAllPositive(distance, duration, cadence)
      ) {
        document.body.insertAdjacentHTML('beforebegin', alert);
        /// Alert Close handler
        const closeAlert = document.querySelector('.btn--close');
        closeAlert.addEventListener('click', function () {
          document.querySelector('.warning').remove();
        });
        return;
      }

      workout = new Running(distance, duration, [lat, lng], cadence);
    }

    /// If workout activity cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      /// Check if inputs are valid
      if (
        !whetherAllNumbers(distance, duration, elevation) ||
        !whetherAllPositive(distance, duration, elevation)
      ) {
        document.body.insertAdjacentHTML('beforebegin', alert);
        /// Alert Close handler
        const closeAlert = document.querySelector('.btn--close');
        closeAlert.addEventListener('click', function () {
          document.querySelector('.warning').remove();
        });
        return;
      }

      workout = new Cycling(distance, duration, [lat, lng], elevation);
    }

    /// Add a new object to workout array
    this.#workouts.push(workout);

    /// Render workout on map as marker
    this.#renderWorkoutMarker(workout);

    /// Render workput on list
    this.#renderWorkoutList(workout);

    /// Hide form and clear Input Fields
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);

    // prettier-ignore
    inputCadence.value = inputDistance.value = inputDuration.value = inputElevation.value = '';

    /// Set LocalStorage
    this.#setLocalStorage();
  }

  /// Marker and Popup
  #renderWorkoutMarker(workout) {
    L.marker(workout.coords)
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
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  // <i class="fas fa-pen"></i><i class="fas fa-trash"></i>

  /// Workout List
  #renderWorkoutList(workout) {
    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title"><span>${
          workout.description
        }</span><i class="fas fa-trash"></i><i class="fas fa-pen"></i></h2>
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
          }</span>
          <span class="workout__value">${workout.distance}</span>
          <span span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⏱</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;

    if (workout.type === 'running') {
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
      </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">🌄</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  /// Move to the marker on click
  #workoutMenu(e) {
    const workoutEl = e.target.closest('.workout');

    if (e.target.classList.contains('fa-pen'))
      this.#editWork(e.target.closest('.workout'));
    else if (e.target.classList.contains('fa-trash'))
      this.#deleteWork(e.target.closest('.workout'));
    else if (workoutEl) {
      const workout = this.#workouts.find(
        work => work.id == workoutEl.dataset.id
      );

      this.#map.setView(workout.coords, 17, {
        animate: true,
        pan: {
          duration: 1,
        },
      });

      // NOTE: When we get objects back from local storage they lose their prortypes chain, thus this will give an error
      // workout.click();
    } else return;
  }

  /// Local Storage
  #setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  #getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    /* 
    data.forEach(w => {
      let work;

      if (w.type === 'running')
        work = new Running(w.distance, w.duration, w.coords, w.cadence);

      if (w.type === 'cycling')
        work = new Cycling(w.distance, w.duration, w.coords, w.elevationGain);

      this.#workouts.push(work);
    }); 
    */

    this.#workouts = data;
    this.#workouts.forEach(workout => this.#renderWorkoutList(workout));
  }

  /// Delete ALl
  #deleteAllWorkout(e) {
    e.preventDefault();

    if (this.#workouts.length === 0) return;

    const input = prompt('Enter "delete" to delete all the data.');

    if (!input) return;
    if (input.toLowerCase() !== 'delete') return;

    this.#workouts = [];
    this.#setLocalStorage();
    location.reload();
  }

  /// Clear List
  #clearList() {
    const workel = document.querySelectorAll('.workout');
    workel.forEach(w => w.remove());
  }

  /// Sort
  #sortWorkout(e) {
    e.preventDefault();

    if (this.#workouts.length === 0) return;

    if (this.#sort === true) {
      this.#clearList();
      this.#workouts.forEach(work => this.#renderWorkoutList(work));
      return (this.#sort = false);
    }

    const running = this.#workouts.filter(work => work.type === 'running');
    const cycling = this.#workouts.filter(work => work.type === 'cycling');
    const sorted = [...cycling, ...running];

    this.#clearList();

    sorted.forEach(work => this.#renderWorkoutList(work));
    this.#sort = true;
  }

  /// Edit Workout
  #editWork(work) {
    // Open Modal
    (function () {
      modal.classList.remove('modal-hidden');
      overlay.classList.remove('modal-hidden');
    })();

    // Close Modal
    const closeModal = function () {
      modal.classList.add('modal-hidden');
      overlay.classList.add('modal-hidden');
    };
    btnCloseModal.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    // Edit Part
    const exercise = this.#workouts.find(wk => wk.id === work.dataset.id);
    inputDistanceEdit.value = exercise.distance;
    inputDurationEdit.value = exercise.duration;
    inputTypeEdit.value = exercise.type;
    if (exercise.type === 'running') {
      inputCadenceEdit.classList.remove('input-hidden');
      labelCadenceEdit.classList.remove('input-hidden');
      inputElevationEdit.classList.add('input-hidden');
      labelElevationEdit.classList.add('input-hidden');
      inputCadenceEdit.value = exercise.cadence;
    }
    if (exercise.type === 'cycling') {
      inputCadenceEdit.classList.add('input-hidden');
      labelCadenceEdit.classList.add('input-hidden');
      inputElevationEdit.classList.remove('input-hidden');
      labelElevationEdit.classList.remove('input-hidden');
      inputElevationEdit.value = exercise.elevationGain;
    }

    const formSubmit = function (e) {
      e.preventDefault();

      exercise.distance = inputDistanceEdit.value;
      exercise.duration = inputDurationEdit.value;
      exercise.type = inputTypeEdit.value;
      if (exercise.type === 'running') {
        exercise.cadence = inputCadenceEdit.value;
        exercise.pace = exercise.duration / exercise.distance;
      }
      if (exercise.type === 'cycling') {
        exercise.elevationGain = inputElevationEdit.value;
        exercise.speed = exercise.distance / (exercise.duration / 60);
      }

      this.#workouts.forEach(wk => {
        if (wk.id === work.dataset.id) wk = exercise;
      });
      closeModal();

      this.#setLocalStorage();
      location.reload();
    };

    formEdit.addEventListener('submit', formSubmit.bind(this));
  }

  /// Delete Workout
  #deleteWork(work) {
    this.#workouts = this.#workouts.filter(wk => wk.id !== work.dataset.id);

    this.#setLocalStorage();
    location.reload();
  }
}

const app = new App();
