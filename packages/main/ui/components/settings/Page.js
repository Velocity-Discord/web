import FormTitle from "../reworks/FormTitle";

export default (props) => {
    const { title, children } = props;

    return [<FormTitle tag="h1">{title}</FormTitle>, children];
};
