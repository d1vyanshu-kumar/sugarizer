// Rebase require directory
requirejs.config({
  baseUrl: "lib",
  paths: {
    activity: "../js"
  }
});

var requestAnimationFrame = window.requestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.msRequestAnimationFrame;

// Vue main app
var app = new Vue({
  el: '#app',
  components: {
    'game': Game,
    'result': Result,
  },
  data: function() {
    return {
      currentScreen: "game",
      strokeColor: '#f0d9b5',
      fillColor: '#b58863',
      currentenv: null,
      SugarL10n: null,
      SugarPresence: null,
      sugarPopup: null,
      mode: 'non-timer',
      score: 0,
      level: 0,
      compulsoryOps: [],
      compulsoryOpsRem: [],
      clock: {
        active: false,
        previousTime: null,
        time: 0,
        timer: false,
      },
      questionsGenerator: null,
      hintsGenerator: null,
      questions: [
        {
          inputNumbers: [0,0,0,0,0],
          targetNum: 0,
          bestSoln: [],
        },
      ],
      qNo:0,
      slots:[[]],
      inputNumbers: [0,0,0,0,0],
      inputNumbersTypes:[0,0,0,0,0],
      prev: {
        skipIndex1: [],
        skipIndex2: []
      },
      hint: []
    }
  },
  mounted: function() {
    var vm = this;
    setTimeout(() => {
       window.dispatchEvent(new Event('resize'));
     }, 0);
  },
  watch: {
    currentScreen: function(newVal) {
      var vm = this;
      if (newVal === 'game') {
        //Initialize clock
        vm.$set(vm.clock, 'time', 0);
        vm.$set(vm.clock, 'active', true);
        vm.$set(vm.clock, 'previousTime', new Date());
        vm.score = 0;
        vm.slots = [[]];
        vm.qNo = 0;
        //vm.tick();
      }
    },
    slots: function (newVal) {
      var vm = this;
      //update compulsoryOpsRem
      vm.updateCompulsoryOpsRem();
      //generating hint
      vm.generateHint();
    },
    compulsoryOps: function functionName() {
      var vm = this;
      //update compulsoryOpsRem
      vm.updateCompulsoryOpsRem();
      //generating hint
      vm.generateHint();
    }
  },
  methods: {
    initialized: function() {
      var vm = this;
      // Initialize Sugarizer
      vm.currentenv = vm.$refs.SugarActivity.getEnvironment();
      vm.sugarPopup = vm.$refs.SugarPopup;

      document.getElementById('app').style.background = vm.currentenv.user.colorvalue.stroke;
      vm.strokeColor = vm.currentenv.user.colorvalue.stroke;
      vm.fillColor = vm.currentenv.user.colorvalue.fill;

      //Initialize questionsGenerator
      vm.questionsGenerator = new QuestionsGenerator();
      //generating questions set
      vm.generateQuestionSet();

      //Initialize hintsGenerator
      vm.hintsGenerator = new HintsGenerator();
      vm.generateHint();

      //Initialize clock
      vm.$set(vm.clock, 'time', 0);
      vm.$set(vm.clock, 'active', true);
      vm.$set(vm.clock, 'previousTime', new Date());
      vm.tick();

    },

    updateCompulsoryOpsRem: function () {
      var vm = this;
      vm.compulsoryOpsRem = [];
      if (vm.slots[vm.qNo].length != 0) {
        //check if the operator used contains compulsoryOps
        for (var i = 0; i < vm.compulsoryOps.length; i++) {
          var tmp = vm.slots[vm.qNo].find(function(ele) {
            return ele.operator === vm.compulsoryOps[i];
          });
          if (!tmp) {
            vm.compulsoryOpsRem.push(vm.compulsoryOps[i]);
          }
        }
      }
    },

    generateHint: function () {
      var vm = this;
      var slots = vm.hintsGenerator.generate(vm.inputNumbers, vm.questions[vm.qNo].targetNum, vm.compulsoryOpsRem);
      vm.hint = slots.shift();
      if (vm.hint) {
        var nextSlot = vm.hint[0].val + ' ' + vm.hint[1] + ' ' + vm.hint[2].val + ' = ' + vm.hint[3];
      }else {
        var nextSlot = "No Hint"
      }
      setTimeout(() => {
         document.getElementById('hint-text').innerHTML = nextSlot;
       }, 0);
    },

    generateQuestionSet: function () {
      var vm = this;
      vm.questions = vm.questionsGenerator.generate(vm.level,1);
      vm.qNo = 0;
      vm.inputNumbers = vm.questions[vm.qNo].inputNumbers;
      vm.inputNumbersTypes = [0,0,0,0,0];
    },

    onValidate: function(data) {
      var vm = this;
      //stop timer
      vm.clock.active = false;
      //calculate score
      var slots = vm.slots[vm.qNo];
      var timeTaken = vm.clock.time;
      var scr = calculateScoreFromSlots(slots, timeTaken);
      vm.score += scr;

      if (vm.mode === 'non-timer') {
        //change currentScreen
        vm.currentScreen = "result";
      }

    },

    onSlotsUpdated: function (data) {
      var vm = this;
      if (data.type === 'add') {
        vm.slots[vm.qNo].push(data.data.slot);

        var res = data.data.slot.res;
        var skipIndex1 = data.data.skipIndex1;
        var skipIndex2 = data.data.skipIndex2;

        vm.prev.skipIndex1.push(skipIndex1);
        vm.prev.skipIndex2.push(skipIndex2);

        var newNums = removeEntryFromArray(vm.inputNumbers, skipIndex1);
        var newTypes = removeEntryFromArray(vm.inputNumbersTypes, skipIndex1);
        if (skipIndex1 < skipIndex2) {
          skipIndex2--;
        }
        newNums = removeEntryFromArray(newNums, skipIndex2);
        newTypes = removeEntryFromArray(newTypes, skipIndex2);
        newNums.push(res);
        newTypes.push(1);

        vm.inputNumbers = newNums;
        vm.inputNumbersTypes = newTypes;

      }

    },

    tick: function() {
      var vm = this;

      if (vm.clock.active) {
        var currentTime = new Date();
        if (currentTime - vm.clock.previousTime >= 1000) {
          vm.clock.previousTime = currentTime;

          if (vm.clock.timer) {
            vm.clock.time--;
          } else {
            vm.clock.time++;
          }
        }
      }

      requestAnimationFrame(vm.tick.bind(vm));
    },

    handleRestartButton: function () {
      var vm = this;
      if (vm.currentScreen === 'game') {
        //stop timer
        vm.clock.active = false;
        vm.slots = [[]];
        vm.score=0;
        //change currentScreen
        vm.currentScreen = "result";
      }
      else {
        //generating questions set
        vm.generateQuestionSet();

        //change currentScreen
        vm.currentScreen = "game";
      }
    },

    handlePassButton: function () {
      var vm = this;
      if (vm.currentScreen === 'game') {
        //stop timer
        vm.clock.active = false;
        vm.slots = [[]];
        vm.score+=0;
        if (vm.mode === 'non-timer') {
          //change currentScreen
          vm.currentScreen = "result";
        }else {
          //go to next question in question set for timer mode
          vm.qNo++;
        }

      }
      else {
        //generating questions set
        vm.generateQuestionSet();

        //change currentScreen
        vm.currentScreen = "game";
      }
    },

    handleUndoButton: function () {
      var vm = this;
      if (vm.currentScreen === 'game' && vm.slots[vm.qNo].length!=0) {
        var removedSlot = vm.slots[vm.qNo].pop();

        //changing inputNumbers
        vm.inputNumbers.pop();
        vm.inputNumbersTypes.pop();
        var addIndex1 = vm.prev.skipIndex1.pop();
        var addIndex2 = vm.prev.skipIndex2.pop();

        if (addIndex1 < addIndex2) {
          var newNums = addEntryIntoArray(vm.inputNumbers, addIndex1, removedSlot.num1.val);
          var newTypes = addEntryIntoArray(vm.inputNumbersTypes, addIndex1, removedSlot.num1.type);
          newNums = addEntryIntoArray(newNums, addIndex2, removedSlot.num2.val);
          newTypes = addEntryIntoArray(newTypes, addIndex2, removedSlot.num2.type);
        }else {
          var newNums = addEntryIntoArray(vm.inputNumbers, addIndex2, removedSlot.num2.val);
          var newTypes = addEntryIntoArray(vm.inputNumbersTypes, addIndex2, removedSlot.num2.type);
          newNums = addEntryIntoArray(newNums, addIndex1, removedSlot.num1.val);
          newTypes = addEntryIntoArray(newTypes, addIndex1, removedSlot.num1.type);
        }

        vm.inputNumbers = newNums;
        vm.inputNumbersTypes = newTypes;

      }
    },

    onDifficultySelected: function (data) {
      var vm = this;
      vm.level = data.index;
      if (vm.currentScreen === 'game') {
        // start a new game
        vm.slots = [[]];
        vm.score=0;
        vm.clock.time = 0;
        vm.generateQuestionSet();
      }

    },

    onCompulsoryOpSelected: function (data) {
      var vm = this;
      if (data.operator) {
        var indx = vm.compulsoryOps.indexOf(data.operator);
        if (indx === -1) {
          vm.compulsoryOps.push(data.operator);
        }else {
          vm.compulsoryOps = removeEntryFromArray(vm.compulsoryOps, indx);
        }
      }
      vm.sugarPopup.log("Compulsory Operator Has Been Changed")
    },

    fullscreen: function () {
			this.$refs.SugarToolbar.hide();
      setTimeout(() => {
         window.dispatchEvent(new Event('resize'));
       }, 0);
		},

		unfullscreen: function () {
			this.$refs.SugarToolbar.show();
      setTimeout(() => {
         window.dispatchEvent(new Event('resize'));
       }, 0);
		},

  }
});
