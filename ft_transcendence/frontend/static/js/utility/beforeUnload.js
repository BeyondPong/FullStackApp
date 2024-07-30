export default function handleBeforeUnload(event) {
    event.preventDefault();
    event.returnValue = '';
    return '이 페이지를 떠나시겠습니까?';
  }