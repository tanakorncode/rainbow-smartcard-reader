moment.locale("th");

var socket = io("http://localhost:3000");

var app = new Vue({
  el: "#app",
  data: {
    message: "Hello Vue!",
    profile: null,
    loading: false,
    deviceConnect: false,
    kiosk_id: "",
    kiosk_list: []
  },
  computed: {
    avatar: function () {
      if (!this.profile) return "";
      return this.profile.photo;
    }
  },
  mounted() {
    this.fetchDataKiosk();
    this.initSocketEvents()
  },
  methods: {
    getProfile: function (attr, defaultValue = "") {
      if (!this.profile) return defaultValue;
      return this.profile[attr] || defaultValue;
    },
    fetchDataKiosk: async function () {
      try {
        const { data } = await axios.get(
          `http://yii2-queue-udon.local/api/v1/kiosk/kiosk-list`
        );
        this.kiosk_list = data.data;
        if (window.localStorage.getItem("kiosk_id")) {
          this.kiosk_id = window.localStorage.getItem("kiosk_id");
        }
      } catch (error) {
        throw new Error(error)
      }
    },
    onChangeKiosk: function (event) {
      window.localStorage.setItem("kiosk_id", event.target.value);
    },
    initSocketEvents: function () {
      const _this = this
      socket.on("settings", function (data) {
        if (data.controller === 'kiosk') {
          _this.fetchDataKiosk();
        }
      });
    }
  },
  filters: {
    mask: function (str) {
      if (!str) return "";
      return str
        ? str.replace(
          /^(\d{1})(\d{4})(\d{5})(\d{2})(\d{1}).*/,
          "$1 $2 $3 $4 $5"
        )
        : "";
    },
    birthdateFormat: function (str) {
      if (!str) return "";
      return (
        moment(str).format("DD MMM ") +
        (parseInt(moment(str).format("YYYY")) + 543)
      );
    }
  }
});
