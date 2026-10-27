import {
  AxiosError,
  AxiosHeaders,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';

export interface StubResponse {
  status: number;
  data?: unknown;
  headers?: Record<string, string>;
}

type StubRoute =
  StubResponse | ((config: InternalAxiosRequestConfig) => StubResponse);

export const respond = (
  config: InternalAxiosRequestConfig,
  { status, data = {}, headers = {} }: StubResponse,
): Promise<AxiosResponse> => {
  const response: AxiosResponse = {
    status,
    statusText: String(status),
    data,
    headers: new AxiosHeaders(headers),
    config,
  };

  if (status >= 400) {
    return Promise.reject(
      new AxiosError(
        `Request failed with status code ${status}`,
        AxiosError.ERR_BAD_REQUEST,
        config,
        null,
        response,
      ),
    );
  }

  return Promise.resolve(response);
};

export const csrfResponse = (token: string): StubResponse => ({
  status: 200,
  data: { data: { csrfToken: token } },
  headers: { 'x-csrf-token': token },
});

export const requestKey = ({
  method = 'get',
  url,
}: InternalAxiosRequestConfig) => `${method.toUpperCase()} ${url}`;

export const requestBody = ({ data }: InternalAxiosRequestConfig): unknown =>
  typeof data === 'string' ? JSON.parse(data) : data;

// Routes are keyed by "METHOD /path"; a route may change between calls by reassigning it.
export const stubHttpRoutes = (
  client: AxiosInstance,
  routes: Record<string, StubRoute>,
) => {
  const requests: InternalAxiosRequestConfig[] = [];

  client.defaults.adapter = (config) => {
    requests.push(config);
    const route = routes[requestKey(config)];

    if (!route) {
      throw new Error(`Unexpected request: ${requestKey(config)}`);
    }

    return respond(config, typeof route === 'function' ? route(config) : route);
  };

  return requests;
};
