import axios from "axios";

const HttpService = axios.create({
  baseURL: import.meta.env.VITE_APP_API_URL,
});

export default HttpService;
