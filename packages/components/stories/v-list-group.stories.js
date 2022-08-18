import VListGroup from '../src/components/v-list-group.vue';
document.body.classList.add('light')

export default {
    title: 'Example/VListGroup',
    component: VListGroup,
    argTypes: {

    },
};

const Template = (args) => ({
    setup() {
        return { args };
    },
    template: `
<v-list>
    <v-list-item>Item 1 </v-list-item>
    <v-list-item>Item 2 </v-list-item>

    <v-list-group v-bind="args">
		<template #activator="{active}">
			<v-list-item>Group Item 3</v-list-item>
		</template>

		<v-list-item>Item 3-1</v-list-item>
		<v-list-item>Item 3-2</v-list-item>
		<v-list-item>Item 3-2</v-list-item>
	</v-list-group>
    <v-list-item>Item 4 </v-list-item>
</v-list>
    `,
});

export const Primary = Template.bind({});
Primary.args = {
    open: true
};