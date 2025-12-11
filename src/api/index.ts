import HttpService from './HttpService';
import { CreateListnerDataType, CreateSessionDataType, RoleDataType, UserUpdateFormData } from '../types';

//Auth API
export const LoginAPI = async (value: { password: string; email: string }) =>
  await HttpService.post(`login`, value);

// User API
export const GetAllUserApi = async ({ queryKey }: { queryKey: [string, number] }) => {
  const [, page] = queryKey;
  return await HttpService.get(
    `users?limit=5&page=${page}`
  );
};

export const DeleteUserApi = async (id: string) => {
  return await HttpService.delete(`users/${id}`);
};

export const ViewUserApi = async (id: string) => {
  return await HttpService.get(`users/${id}`);
};

export const UpdateUserApi = async (id: string, body: UserUpdateFormData) => {
  return await HttpService.put(`users/${id}`, body);
};

// Listener Api
export const GetAllListenerApi = async ({ queryKey }: { queryKey: [string, number] }) => {
  const [, page] = queryKey;
  return await HttpService.get(
    `listener?limit=5&page=${page}`
  );
};

export const CreateListenerApi = async (body: CreateListnerDataType) => {
  return await HttpService.post(`listener/promote`, body);
};

export const UpdateListenerApi = async (id: string, body: CreateListnerDataType) => {
  return await HttpService.put(`listener/${id}`, body);
}

export const ViewListenerApi = async (id: string) => {
  return await HttpService.get(`listener/${id}`);
}

export const DeleteListnerApi = async (id: string) => {
  return await HttpService.delete(`listener/${id}`);
};

// Session Api
export const GetAllSessionsApi = async ({ queryKey }: { queryKey: [string, number] }) => {
  const [, page] = queryKey;
  return await HttpService.get(
    `sessions?limit=5&page=${page}`
  );
};

export const CreateSessionsApi = async (body: CreateSessionDataType) => {
  return await HttpService.post(`sessions`, body);
};

export const ViewSessionsApi = async (id: string) => {
  return await HttpService.get(`sessions/${id}`);
}

export const DeleteSessionsApi = async (id: string) => {
  return await HttpService.delete(`sessions/${id}`);
}

export const UpdateSessionApi = async (id: string, body: CreateSessionDataType) => {
  return await HttpService.put(`sessions/${id}`, body);
}

// Role Api
export const GetAllRoleApi = async ({ queryKey }: { queryKey: [string, number] }) => {
  const [, page] = queryKey;
  return await HttpService.get(
    `roles?limit=5&page=${page}`
  );
};

export const CreateRoleApi = async (body: RoleDataType) => {
  return await HttpService.post(`roles`, body);
};

export const DeleteRoleApi = async (id: string) => {
  return await HttpService.delete(`roles/${id}`,);
};

export const ViewRoleApi = async (id: string) => {
  return await HttpService.get(`roles/${id}`);
};

export const DuplicateRoleApi = async (id: string) => {
  return await HttpService.post(`roles/${id}/duplicate`);
}

export const UpdateRoleApi = async (id: string, body: RoleDataType) => {
  return await HttpService.put(`roles/${id}`, body);
}
