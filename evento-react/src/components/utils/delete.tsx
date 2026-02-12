import { toast } from 'react-toastify';
import { axiosInstanceAuth } from "@/axiosConfig";

export const handleDelete = ({ path, id, router }: any) => {

    axiosInstanceAuth.delete(`/api/${path}/${id}`)
        .then(response => {
            // Handle success
            console.log(response);
            toast.success('Успешно удалено');
            setTimeout(() => {
                router.back();
            }, 1000)
        })
        .catch(error => {
            // Handle error
            console.log(error);
            toast.error('Ошибка при удалении');
        });
};
